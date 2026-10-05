/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLACK_INTAKE_QUESTIONS } from './questions';
import { createAskSlackIntakeRoute } from './typesafe_client';

const systemOne = jest.fn();
const TypeSafeClient = jest.fn().mockImplementation(() => ({ systemOne }));

jest.mock('@typesafe-ai/sdk', () => ({
  TypeSafeClient: function MockTypeSafeClient(config: unknown) {
    return TypeSafeClient(config);
  },
}));

const state = {
  message: { text: 'checkout is failing', in_thread: false, from_bot: false },
  thread_investigation: null,
};

describe('createAskSlackIntakeRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    systemOne.mockResolvedValue({
      model: 'jev-test',
      usage: { input_tokens: 30, output_tokens: 1 },
      answers: {
        route: {
          type: 'choice',
          choice: 'new_investigation',
          confidence: 0.9,
          probabilities: {
            ignore: 0.02,
            answer_directly: 0.05,
            new_investigation: 0.91,
            followup_investigation: 0.02,
          },
        },
      },
    });
  });

  it.each([
    [
      'passes the configured key and settings explicitly',
      { baseUrl: 'http://kev.local', model: 'kev-4b' },
      { baseURL: 'http://kev.local', defaultModel: 'kev-4b' },
    ],
    [
      'pins the endpoint and model so the environment cannot redirect them',
      {},
      { baseURL: 'https://api.typesafe.ai', defaultModel: 'jev-latest' },
    ],
  ])('%s', async (_, settings, expected) => {
    await createAskSlackIntakeRoute({ apiKey: 'key-1', timeoutMs: 2_000, ...settings })(state);

    expect(TypeSafeClient).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'key-1', timeout: 2_000, ...expected })
    );
  });

  it('asks the frozen route question and maps the answer', async () => {
    const ask = createAskSlackIntakeRoute({ apiKey: 'key-1', timeoutMs: 2_000 });
    const signal = new AbortController().signal;

    const answer = await ask(state, signal);

    expect(systemOne).toHaveBeenCalledWith(
      { state, questions: SLACK_INTAKE_QUESTIONS },
      { signal }
    );
    expect(answer).toEqual({
      route: 'new_investigation',
      probabilities: expect.objectContaining({ new_investigation: 0.91 }),
      model: 'jev-test',
      inputTokens: 30,
      outputTokens: 1,
    });
  });

  it('builds the client once across calls', async () => {
    const ask = createAskSlackIntakeRoute({ apiKey: 'key-1', timeoutMs: 2_000 });

    await ask(state);
    await ask(state);

    expect(TypeSafeClient).toHaveBeenCalledTimes(1);
  });
});
