/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SLACK_INTAKE_ROUTES = [
  'ignore',
  'answer_directly',
  'new_investigation',
  'followup_investigation',
] as const;

export type SlackIntakeRoute = (typeof SLACK_INTAKE_ROUTES)[number];

/** What the workflow does next. `answer_directly` has no action yet, so it resolves to `none`. */
export const SLACK_INTAKE_ACTIONS = [
  'none',
  'start_investigation',
  'continue_investigation',
] as const;

export type SlackIntakeAction = (typeof SLACK_INTAKE_ACTIONS)[number];

/** Slack message fields the intake decision is built from (the `slack2.message` event payload). */
export interface SlackIntakeMessage {
  text: string;
  channel: string;
  messageId: string;
  threadId?: string;
  sender?: string;
  subtype?: string;
  botId?: string;
}

export type SlackIntakeSkipReason =
  | 'disabled'
  | 'empty_text'
  | 'unsupported_subtype'
  /** The thread root already started an investigation, so this is a redelivery. */
  | 'already_investigated';

/**
 * Gate outcome. `wouldAct` is the model-confidence verdict, kept for offline scoring; `action`
 * is what the workflow runs, and is `none` whenever the route cannot safely be acted on.
 */
export type SlackIntakeDecision =
  | {
      status: 'decided';
      /** Final route, after guards. */
      route: SlackIntakeRoute;
      /** What the model chose before guards; differs from `route` when a guard demoted it. */
      modelRoute: SlackIntakeRoute;
      linkedInvestigationId?: string;
      probability: number;
      probabilities: Record<SlackIntakeRoute, number>;
      wouldAct: boolean;
      action: SlackIntakeAction;
      model: string;
      questionsVersion: string;
      latencyMs: number;
      inputTokens: number;
      outputTokens: number;
    }
  | { status: 'skipped'; reason: SlackIntakeSkipReason; wouldAct: false }
  | { status: 'error'; message: string; wouldAct: false; latencyMs: number };

export interface SlackIntakeRouteAnswer {
  route: SlackIntakeRoute;
  probabilities: Record<SlackIntakeRoute, number>;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/** The investigation already started from this Slack thread, found by the thread's workspace, channel and root timestamp. */
export interface LinkedInvestigation {
  id: string;
  title: string;
  status: string;
  summary?: string;
}

/** The state encoded once per call; kept small and free of ids the model cannot use. */
export interface SlackIntakeState {
  message: {
    text: string;
    in_thread: boolean;
    from_bot: boolean;
  };
  /** Null when the thread has no investigation, so a follow-up has nothing to continue. */
  thread_investigation: { title: string; status: string; summary: string | null } | null;
}

/** Asks the decision model for one route. Implemented over the TypeSafe SDK. */
export type AskSlackIntakeRoute = (
  state: SlackIntakeState,
  signal?: AbortSignal
) => Promise<SlackIntakeRouteAnswer>;
