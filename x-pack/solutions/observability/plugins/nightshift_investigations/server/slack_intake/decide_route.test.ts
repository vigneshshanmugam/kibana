/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  buildSlackIntakeState,
  createSlackIntakeDecider,
  MAX_INTAKE_SUMMARY_LENGTH,
  MAX_INTAKE_TEXT_LENGTH,
} from './decide_route';
import { SLACK_INTAKE_QUESTIONS_VERSION } from './questions';
import type { AskSlackIntakeRoute, SlackIntakeMessage, SlackIntakeRoute } from './types';

const message: SlackIntakeMessage = {
  text: 'checkout error rate jumped to 12% after the 14:05 deploy',
  channel: 'C1',
  messageId: '1700000000.000100',
};

const answer = (route: SlackIntakeRoute, probability: number) => {
  const rest = (1 - probability) / 3;
  const probabilities: Record<SlackIntakeRoute, number> = {
    ignore: rest,
    answer_directly: rest,
    new_investigation: rest,
    followup_investigation: rest,
  };
  probabilities[route] = probability;
  return {
    route,
    probabilities,
    model: 'jev-test',
    inputTokens: 40,
    outputTokens: 2,
  };
};

const createDecider = (ask: AskSlackIntakeRoute | undefined, enabled = true) =>
  createSlackIntakeDecider({
    isEnabled: async () => enabled,
    getAsk: () => ask,
    actThreshold: 0.8,
    timeoutMs: 1_000,
    logger: loggerMock.create(),
  });

const linked = {
  id: 'inv-1',
  title: 'Checkout 5xx after deploy',
  status: 'completed',
  summary: 'Redis saturation after the 14:05 deploy.',
};

describe('buildSlackIntakeState', () => {
  it('carries the thread investigation, with a bounded summary', () => {
    expect(
      buildSlackIntakeState(message, { ...linked, summary: 'x'.repeat(5_000) }).thread_investigation
    ).toEqual({
      title: linked.title,
      status: 'completed',
      summary: 'x'.repeat(MAX_INTAKE_SUMMARY_LENGTH),
    });
  });

  it('is null when the thread has no investigation', () => {
    expect(buildSlackIntakeState(message).thread_investigation).toBeNull();
  });

  it('flags thread replies and bot posts', () => {
    expect(
      buildSlackIntakeState({ ...message, threadId: '1699999999.000001', botId: 'B1' }).message
    ).toMatchObject({ in_thread: true, from_bot: true });
    expect(buildSlackIntakeState(message).message).toMatchObject({
      in_thread: false,
      from_bot: false,
    });
  });

  it('treats a thread root as not in a thread', () => {
    expect(
      buildSlackIntakeState({ ...message, threadId: message.messageId }).message.in_thread
    ).toBe(false);
  });

  it('bounds the text sent to the model', () => {
    const state = buildSlackIntakeState({
      ...message,
      text: 'x'.repeat(MAX_INTAKE_TEXT_LENGTH * 2),
    });
    expect(state.message.text).toHaveLength(MAX_INTAKE_TEXT_LENGTH);
  });
});

describe('createSlackIntakeDecider', () => {
  it('skips when no key is configured', async () => {
    expect(await createDecider(undefined)(message)).toEqual({
      status: 'skipped',
      reason: 'disabled',
      wouldAct: false,
    });
  });

  it('skips without calling the model while the Nightshift flag is off', async () => {
    const ask = jest.fn();
    expect(await createDecider(ask, false)(message)).toEqual({
      status: 'skipped',
      reason: 'disabled',
      wouldAct: false,
    });
    expect(ask).not.toHaveBeenCalled();
  });

  it.each([
    ['empty text', { text: '   ' }, 'empty_text'],
    ['an edit', { subtype: 'message_changed' }, 'unsupported_subtype'],
    ['a deletion', { subtype: 'message_deleted' }, 'unsupported_subtype'],
  ])('skips %s without calling the model', async (_name, override, reason) => {
    const ask = jest.fn();
    const decision = await createDecider(ask)({ ...message, ...override });
    expect(decision).toEqual({ status: 'skipped', reason, wouldAct: false });
    expect(ask).not.toHaveBeenCalled();
  });

  it('still routes bot posts such as alert notifications', async () => {
    const ask = jest.fn().mockResolvedValue(answer('new_investigation', 0.95));
    const decision = await createDecider(ask)({
      ...message,
      subtype: 'bot_message',
      botId: 'B1',
    });
    expect(decision.status).toBe('decided');
  });

  it('would act on a confident non-ignore route', async () => {
    const ask = jest.fn().mockResolvedValue(answer('new_investigation', 0.92));
    const decision = await createDecider(ask)(message);
    expect(decision).toMatchObject({
      status: 'decided',
      route: 'new_investigation',
      probability: 0.92,
      wouldAct: true,
      model: 'jev-test',
      questionsVersion: SLACK_INTAKE_QUESTIONS_VERSION,
    });
  });

  it('starts an investigation for a confident new problem in an unlinked thread', async () => {
    const ask = jest.fn().mockResolvedValue(answer('new_investigation', 0.92));
    expect(await createDecider(ask)(message)).toMatchObject({ action: 'start_investigation' });
  });

  it('reports status for a confident follow-up in a linked thread', async () => {
    const ask = jest.fn().mockResolvedValue(answer('followup_investigation', 0.95));
    expect(
      await createDecider(ask)({ ...message, threadId: '1699999999.000001' }, linked)
    ).toMatchObject({ action: 'continue_investigation' });
  });

  it('does not start a second investigation in a thread that already has one', async () => {
    const ask = jest.fn().mockResolvedValue(answer('new_investigation', 0.95));
    expect(
      await createDecider(ask)({ ...message, threadId: '1699999999.000001' }, linked)
    ).toMatchObject({ route: 'new_investigation', wouldAct: true, action: 'none' });
  });

  it('never acts on a bot message, so its own replies cannot loop', async () => {
    const ask = jest.fn().mockResolvedValue(answer('new_investigation', 0.99));
    expect(await createDecider(ask)({ ...message, botId: 'B1' })).toMatchObject({
      route: 'new_investigation',
      action: 'none',
    });
  });

  it('has no action for a direct answer yet', async () => {
    const ask = jest.fn().mockResolvedValue(answer('answer_directly', 0.99));
    expect(await createDecider(ask)(message)).toMatchObject({ action: 'none' });
  });

  it('thresholds on the route probability, not on a confidence figure', async () => {
    const ask = jest.fn().mockResolvedValue(answer('new_investigation', 0.6));
    expect(await createDecider(ask)(message)).toMatchObject({
      route: 'new_investigation',
      wouldAct: false,
    });
  });

  it('never acts on ignore', async () => {
    const ask = jest.fn().mockResolvedValue(answer('ignore', 0.99));
    expect(await createDecider(ask)(message)).toMatchObject({ route: 'ignore', wouldAct: false });
  });

  it('lets the model continue the thread investigation when one is linked', async () => {
    const ask = jest.fn().mockResolvedValue(answer('followup_investigation', 0.95));
    const decision = await createDecider(ask)(
      { ...message, threadId: '1699999999.000001' },
      linked
    );
    expect(decision).toMatchObject({
      route: 'followup_investigation',
      modelRoute: 'followup_investigation',
      linkedInvestigationId: 'inv-1',
      wouldAct: true,
    });
    expect(ask).toHaveBeenCalledWith(
      expect.objectContaining({
        thread_investigation: expect.objectContaining({ title: linked.title }),
      }),
      expect.anything()
    );
  });

  it('drops a follow-up pick when the thread has no investigation to continue', async () => {
    const ask = jest.fn().mockResolvedValue(answer('followup_investigation', 0.95));
    expect(await createDecider(ask)(message)).toMatchObject({
      route: 'ignore',
      modelRoute: 'followup_investigation',
      wouldAct: false,
    });
  });

  it('skips a root message whose thread already has an investigation as a redelivery', async () => {
    const ask = jest.fn();
    expect(await createDecider(ask)(message, linked)).toEqual({
      status: 'skipped',
      reason: 'already_investigated',
      wouldAct: false,
    });
    expect(ask).not.toHaveBeenCalled();
  });

  it('fails open when the model call throws', async () => {
    const ask = jest.fn().mockRejectedValue(new Error('timeout'));
    expect(await createDecider(ask)(message)).toMatchObject({
      status: 'error',
      message: 'timeout',
      wouldAct: false,
    });
  });
});
