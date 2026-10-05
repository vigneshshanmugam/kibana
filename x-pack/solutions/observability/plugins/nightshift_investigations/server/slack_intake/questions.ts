/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChoiceQuestion } from '@typesafe-ai/sdk';
import type { SlackIntakeRoute } from './types';

/**
 * Bump on any change to the question text or option set. Options of one question interact, so
 * their text and order are frozen per version and every decision logs the version it used.
 */
export const SLACK_INTAKE_QUESTIONS_VERSION = 'slack-intake-route-v2';

const ROUTE_CRITERIA = {
  ignore:
    'Casual chat, acknowledgements, scheduling, or anything that does not need an observability agent.',
  answer_directly:
    'A question about observability data, services, alerts or past incidents that an agent can answer without starting a new investigation.',
  new_investigation:
    'Reports a problem, alert or anomaly in a system that needs root cause analysis and is not already covered by thread_investigation in the state.',
  followup_investigation:
    'Continues the conversation about the investigation in thread_investigation in the state, for example asking about its findings, evidence or status, or asking to extend it. Never chosen when thread_investigation is null.',
} as const satisfies Record<SlackIntakeRoute, string>;

export const SLACK_INTAKE_QUESTIONS = {
  route: {
    type: 'choice',
    instructions:
      'A message was posted in a Slack channel where an observability assistant is installed. The state holds the message and, when this thread already has an investigation, thread_investigation. Where should the message go?',
    criteria: ROUTE_CRITERIA,
  } satisfies ChoiceQuestion<typeof ROUTE_CRITERIA>,
} as const;
