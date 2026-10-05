/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeSafeClient } from '@typesafe-ai/sdk';
import { SLACK_INTAKE_QUESTIONS } from './questions';
import type { AskSlackIntakeRoute } from './types';

// The SDK reads TYPESAFE_BASE_URL and TYPESAFE_DEFAULT_MODEL when these are omitted. Pinning the
// documented defaults keeps the key and message text from being redirected by the environment.
const DEFAULT_BASE_URL = 'https://api.typesafe.ai';
const DEFAULT_MODEL = 'jev-latest';

export interface TypeSafeClientSettings {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeoutMs: number;
}

/**
 * Builds the route question over the TypeSafe SDK. The key, endpoint and model are always passed
 * explicitly, so the SDK never falls back to its environment variables. The SDK loads on first use, so a disabled intake
 * costs nothing at startup. Replaced by the EIS inference path once Jev is served from there.
 */
export const createAskSlackIntakeRoute = ({
  apiKey,
  baseUrl,
  model,
  timeoutMs,
}: TypeSafeClientSettings): AskSlackIntakeRoute => {
  let clientPromise: Promise<TypeSafeClient> | undefined;

  const getClient = (): Promise<TypeSafeClient> => {
    if (!clientPromise) {
      clientPromise = import('@typesafe-ai/sdk')
        .then(
          ({ TypeSafeClient: Client }) =>
            new Client({
              apiKey,
              baseURL: baseUrl ?? DEFAULT_BASE_URL,
              defaultModel: model ?? DEFAULT_MODEL,
              timeout: timeoutMs,
              retry: { maxRetries: 1 },
            })
        )
        .catch((error) => {
          clientPromise = undefined;
          throw error;
        });
    }
    return clientPromise;
  };

  return async (state, signal) => {
    const client = await getClient();
    // The SDK takes JSON state; an interface has no index signature, so pass a literal.
    const result = await client.systemOne(
      {
        state: { message: state.message, thread_investigation: state.thread_investigation },
        questions: SLACK_INTAKE_QUESTIONS,
      },
      { signal }
    );
    const { choice, probabilities } = result.answers.route;
    return {
      route: choice,
      probabilities,
      model: result.model,
      inputTokens: result.usage.input_tokens,
      outputTokens: result.usage.output_tokens,
    };
  };
};
