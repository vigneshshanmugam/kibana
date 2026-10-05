/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { SLACK_INTAKE_QUESTIONS_VERSION } from './questions';
import type {
  AskSlackIntakeRoute,
  SlackIntakeAction,
  LinkedInvestigation,
  SlackIntakeDecision,
  SlackIntakeMessage,
  SlackIntakeRoute,
  SlackIntakeState,
} from './types';

export const MAX_INTAKE_TEXT_LENGTH = 4_000;
export const MAX_INTAKE_SUMMARY_LENGTH = 600;

/** Subtypes that carry message content; edits, deletes and channel events are not routed. */
const ROUTABLE_SUBTYPES: ReadonlySet<string | undefined> = new Set([
  undefined,
  'bot_message',
  'thread_broadcast',
  'file_share',
]);

export const buildSlackIntakeState = (
  message: SlackIntakeMessage,
  linked?: LinkedInvestigation
): SlackIntakeState => ({
  message: {
    text: message.text.slice(0, MAX_INTAKE_TEXT_LENGTH),
    in_thread: message.threadId !== undefined && message.threadId !== message.messageId,
    from_bot: message.botId !== undefined,
  },
  thread_investigation: linked
    ? {
        title: linked.title,
        status: linked.status,
        summary: linked.summary ? linked.summary.slice(0, MAX_INTAKE_SUMMARY_LENGTH) : null,
      }
    : null,
});

/** A follow-up needs an investigation to continue; without one the model's pick is dropped. */
const applyRouteGuards = (
  route: SlackIntakeRoute,
  linked?: LinkedInvestigation
): SlackIntakeRoute => (route === 'followup_investigation' && !linked ? 'ignore' : route);

/**
 * Acting is deliberately narrower than routing: a bot message never acts (so our own replies
 * cannot loop), a second problem in an already-linked thread is left alone because starting it
 * would cancel the running investigation, and `answer_directly` has no action yet.
 */
const resolveAction = ({
  route,
  wouldAct,
  message,
  linked,
}: {
  route: SlackIntakeRoute;
  wouldAct: boolean;
  message: SlackIntakeMessage;
  linked?: LinkedInvestigation;
}): SlackIntakeAction => {
  if (!wouldAct || message.botId !== undefined) {
    return 'none';
  }
  if (route === 'new_investigation' && !linked) {
    return 'start_investigation';
  }
  if (route === 'followup_investigation' && linked) {
    return 'continue_investigation';
  }
  return 'none';
};

export interface SlackIntakeDeciderDeps {
  /** The Nightshift feature flag, read per call so a flip takes effect without a restart. */
  isEnabled: () => Promise<boolean>;
  /** Undefined when no key is configured. */
  getAsk: () => AskSlackIntakeRoute | undefined;
  /** Minimum probability of a non-ignore route before it counts as one the gate would act on. */
  actThreshold: number;
  timeoutMs: number;
  logger: Logger;
}

export type SlackIntakeDecider = (
  message: SlackIntakeMessage,
  linked?: LinkedInvestigation
) => Promise<SlackIntakeDecision>;

/**
 * Gate: one `choice` question per message. Fails open: any problem yields a `skipped` or `error`
 * decision with action `none`, and the thread workflow then continues the thread's existing
 * investigation as it would without a model, so a Jev outage cannot stop Slack replies.
 */
export const createSlackIntakeDecider =
  ({
    isEnabled,
    getAsk,
    actThreshold,
    timeoutMs,
    logger,
  }: SlackIntakeDeciderDeps): SlackIntakeDecider =>
  async (message, linked) => {
    const ask = getAsk();
    if (!ask || !(await isEnabled())) {
      return { status: 'skipped', reason: 'disabled', wouldAct: false };
    }
    if (message.text.trim().length === 0) {
      return { status: 'skipped', reason: 'empty_text', wouldAct: false };
    }
    if (!ROUTABLE_SUBTYPES.has(message.subtype)) {
      return { status: 'skipped', reason: 'unsupported_subtype', wouldAct: false };
    }

    // A root message that already has an investigation is Slack redelivering the event that
    // started it, not a new message to route.
    if (linked && !buildSlackIntakeState(message).message.in_thread) {
      return { status: 'skipped', reason: 'already_investigated', wouldAct: false };
    }

    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const answer = await ask(buildSlackIntakeState(message, linked), controller.signal);
      const route = applyRouteGuards(answer.route, linked);
      const probability = answer.probabilities[route];
      const wouldAct = route !== 'ignore' && probability >= actThreshold;
      return {
        status: 'decided',
        route,
        modelRoute: answer.route,
        linkedInvestigationId: linked?.id,
        probability,
        probabilities: answer.probabilities,
        wouldAct,
        action: resolveAction({ route, wouldAct, message, linked }),
        model: answer.model,
        questionsVersion: SLACK_INTAKE_QUESTIONS_VERSION,
        latencyMs: Date.now() - startedAt,
        inputTokens: answer.inputTokens,
        outputTokens: answer.outputTokens,
      };
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      logger.warn(`Slack intake decision failed, failing open: ${text}`);
      return {
        status: 'error',
        message: text,
        wouldAct: false,
        latencyMs: Date.now() - startedAt,
      };
    } finally {
      clearTimeout(timer);
    }
  };
