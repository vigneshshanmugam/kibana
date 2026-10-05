/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SlackIntakeDecision } from '../slack_intake/types';
import type { GetInvestigationsClient } from '../routes/types';
import { slackIntakeStepDefinition } from './slack_intake';

jest.mock('@kbn/workflows-extensions/server', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

const createContext = (input: Record<string, unknown>) =>
  ({
    input,
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue({}),
      getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'test-space' } }),
    },
  } as never);

const disabled: SlackIntakeDecision = { status: 'skipped', reason: 'disabled', wouldAct: false };

const createDefinition = (decision: SlackIntakeDecision, results: unknown[] = []) => {
  const decide = jest.fn().mockResolvedValue(decision);
  const [thread] = results;
  const findOrCreateSlackThread = jest.fn().mockResolvedValue(thread);
  const get = jest.fn().mockResolvedValue({ status: 'running', summary: 'In progress' });
  const getInvestigationsClient = jest.fn().mockReturnValue({ findOrCreateSlackThread, get });
  return {
    decide,
    findOrCreateSlackThread,
    getInvestigationsClient,
    definition: slackIntakeStepDefinition({
      decide,
      getInvestigationsClient: getInvestigationsClient as unknown as GetInvestigationsClient,
      logger: loggerMock.create(),
    }),
  };
};

const baseInput = {
  workspace: 'T1',
  channel: 'C1',
  message_id: '1700000000.000100',
  text: 'checkout is failing',
};

describe('slackIntakeStepDefinition', () => {
  it('decides on the message and on the investigation the thread workflow keeps, in the workflow space', async () => {
    const { definition, decide, findOrCreateSlackThread, getInvestigationsClient } =
      createDefinition(disabled, [{ investigation_id: 'inv-1', title: 'Checkout 5xx' }]);

    await definition.handler(
      createContext({
        ...baseInput,
        thread_id: '1700000000.000001',
        sender: 'U1',
        subtype: '',
        bot_id: '',
      })
    );

    expect(getInvestigationsClient).toHaveBeenCalledWith({}, 'test-space');
    expect(findOrCreateSlackThread).toHaveBeenCalledWith({
      workspace: 'T1',
      channel: 'C1',
      threadTs: '1700000000.000001',
      create: false,
    });
    // Blank optional fields arrive as undefined.
    expect(decide).toHaveBeenCalledWith(
      {
        text: 'checkout is failing',
        channel: 'C1',
        messageId: '1700000000.000100',
        threadId: '1700000000.000001',
        sender: 'U1',
        subtype: undefined,
        botId: undefined,
      },
      { id: 'inv-1', title: 'Checkout 5xx', status: 'running', summary: 'In progress' }
    );
  });

  it('treats a failed lookup as an unlinked thread', async () => {
    const { definition, decide, findOrCreateSlackThread } = createDefinition(disabled);
    findOrCreateSlackThread.mockRejectedValue(new Error('es down'));

    await definition.handler(createContext(baseInput));

    expect(decide).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it.each([
    [
      'a decision with the action to take',
      {
        status: 'decided',
        route: 'new_investigation',
        modelRoute: 'new_investigation',
        probability: 0.9,
        probabilities: {
          ignore: 0.03,
          answer_directly: 0.03,
          new_investigation: 0.9,
          followup_investigation: 0.04,
        },
        wouldAct: true,
        action: 'start_investigation',
        model: 'jev-test',
        questionsVersion: 'slack-intake-route-v2',
        latencyMs: 120,
        inputTokens: 40,
        outputTokens: 2,
      } as SlackIntakeDecision,
      {
        status: 'decided',
        route: 'new_investigation',
        would_act: true,
        action: 'start_investigation',
      },
    ],
    [
      'a failed decision without failing the step',
      {
        status: 'error',
        message: 'timeout',
        wouldAct: false,
        latencyMs: 5000,
      } as SlackIntakeDecision,
      { status: 'error', would_act: false, action: 'none', reason: 'timeout' },
    ],
  ])('returns %s', async (_, decision, expected) => {
    const { definition } = createDefinition(decision);

    await expect(definition.handler(createContext(baseInput))).resolves.toEqual({
      output: expect.objectContaining(expected),
    });
  });

  it('rejects input without a channel before deciding', async () => {
    const { definition, decide } = createDefinition(disabled);

    await expect(
      definition.handler(createContext({ message_id: '1', text: 'hi' }))
    ).rejects.toThrow();
    expect(decide).not.toHaveBeenCalled();
  });
});
