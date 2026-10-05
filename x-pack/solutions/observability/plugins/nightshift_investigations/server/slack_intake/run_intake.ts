/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { MAX_ID_LENGTH } from '@kbn/significant-events-schema';
import { z } from '@kbn/zod/v4';
import type { SlackIntakeDecider } from './decide_route';
import type { FindLinkedInvestigation } from './find_linked_investigation';
import { SLACK_INTAKE_ACTIONS, SLACK_INTAKE_ROUTES } from './types';
import type { SlackIntakeDecision } from './types';

/** Slack caps message text at 40k characters. */
const MAX_SLACK_TEXT_LENGTH = 40_000;

const optionalId = z.string().max(MAX_ID_LENGTH).optional();

/** Shared by the workflow step and the internal route, so both take the same message. */
export const slackIntakeInputSchema = z.object({
  workspace: z.string().min(1).max(MAX_ID_LENGTH).describe('Slack workspace (team) id'),
  channel: z.string().min(1).max(MAX_ID_LENGTH).describe('Slack channel id'),
  message_id: z.string().min(1).max(MAX_ID_LENGTH).describe('Slack message timestamp'),
  text: z.string().max(MAX_SLACK_TEXT_LENGTH).describe('Message text'),
  thread_id: optionalId.describe('Thread timestamp, when the message is in a thread'),
  sender: optionalId.describe('Slack user id of the author'),
  subtype: optionalId.describe('Slack message subtype'),
  bot_id: optionalId.describe('Slack bot id, when a bot posted the message'),
  correlation_key: optionalId.describe('Slack event id, for tracing redeliveries'),
});

export const slackIntakeOutputSchema = z.object({
  status: z.enum(['decided', 'skipped', 'error']),
  route: z.enum(SLACK_INTAKE_ROUTES).optional().describe('Final route, after guards'),
  model_route: z.enum(SLACK_INTAKE_ROUTES).optional().describe('The model pick before guards'),
  linked_investigation_id: z
    .string()
    .optional()
    .describe('Investigation already started from this Slack thread'),
  probability: z.number().optional().describe('Probability of the chosen route'),
  probabilities: z.record(z.string(), z.number()).optional(),
  would_act: z.boolean().describe('Whether the model was confident enough in a non-ignore route'),
  action: z.enum(SLACK_INTAKE_ACTIONS).describe('What the workflow should do with this message'),
  reason: z.string().optional().describe('Why the message was skipped, or the error message'),
  model: z.string().optional(),
  questions_version: z.string().optional(),
  latency_ms: z.number().optional(),
  input_tokens: z.number().optional(),
  output_tokens: z.number().optional(),
});

export type SlackIntakeInput = z.infer<typeof slackIntakeInputSchema>;
export type SlackIntakeOutput = z.infer<typeof slackIntakeOutputSchema>;

const blankToUndefined = (value: string | undefined): string | undefined =>
  value === undefined || value === '' ? undefined : value;

const toOutput = (decision: SlackIntakeDecision): SlackIntakeOutput => {
  switch (decision.status) {
    case 'decided':
      return {
        status: 'decided',
        action: decision.action,
        route: decision.route,
        model_route: decision.modelRoute,
        linked_investigation_id: decision.linkedInvestigationId,
        probability: decision.probability,
        probabilities: decision.probabilities,
        would_act: decision.wouldAct,
        model: decision.model,
        questions_version: decision.questionsVersion,
        latency_ms: decision.latencyMs,
        input_tokens: decision.inputTokens,
        output_tokens: decision.outputTokens,
      };
    case 'skipped':
      return {
        status: 'skipped',
        action: 'none',
        would_act: false,
        reason: decision.reason,
      };
    case 'error':
      return {
        status: 'error',
        action: 'none',
        would_act: false,
        reason: decision.message,
        latency_ms: decision.latencyMs,
      };
  }
};

/** The one intake entry point; the step and the route are thin callers of it. */
export const runSlackIntake = async ({
  decide,
  findLinkedInvestigation,
  input,
  logger,
}: {
  decide: SlackIntakeDecider;
  findLinkedInvestigation: FindLinkedInvestigation;
  input: SlackIntakeInput;
  logger: Logger;
}): Promise<SlackIntakeOutput> => {
  const message = {
    text: input.text,
    channel: input.channel,
    messageId: input.message_id,
    threadId: blankToUndefined(input.thread_id),
    sender: blankToUndefined(input.sender),
    subtype: blankToUndefined(input.subtype),
    botId: blankToUndefined(input.bot_id),
  };
  // A failed lookup leaves the thread unlinked; a reply the model then routes as a new
  // investigation re-runs the thread's investigation.
  const linked = await findLinkedInvestigation({
    workspace: input.workspace,
    channel: input.channel,
    // A top-level message is the root of the thread its replies will join.
    threadTs: message.threadId ?? message.messageId,
  }).catch((error) => {
    logger.warn(`Slack intake could not look up the thread investigation: ${String(error)}`);
    return undefined;
  });
  const decision = await decide(message, linked);
  const output = toOutput(decision);
  logger.info(
    `Slack intake ${output.status} channel=${input.channel} message=${input.message_id} ` +
      `event=${input.correlation_key ?? 'none'} route=${output.route ?? 'none'} ` +
      `probability=${output.probability ?? 'n/a'} would_act=${output.would_act} action=${
        output.action
      } ` +
      `linked=${output.linked_investigation_id ?? 'none'}`
  );
  return output;
};
