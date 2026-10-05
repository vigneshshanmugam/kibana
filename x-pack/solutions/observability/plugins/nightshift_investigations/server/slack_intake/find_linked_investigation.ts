/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetInvestigationResponse } from '../../common';
import type { SlackThreadInvestigation } from '../client/investigations_client';
import type { LinkedInvestigation } from './types';

export interface SlackThreadRef {
  workspace: string;
  channel: string;
  threadTs: string;
}

export type FindLinkedInvestigation = (
  thread: SlackThreadRef
) => Promise<LinkedInvestigation | undefined>;

interface SlackThreadLookupClient {
  findOrCreateSlackThread: (request: {
    workspace: string;
    channel: string;
    threadTs: string;
    create: false;
  }) => Promise<SlackThreadInvestigation | undefined>;
  get: (id: string) => Promise<GetInvestigationResponse>;
}

/** The investigation the thread workflow keeps for this thread, with the state the router sees. */
export const findLinkedInvestigation = async (
  client: SlackThreadLookupClient,
  { workspace, channel, threadTs }: SlackThreadRef
): Promise<LinkedInvestigation | undefined> => {
  const thread = await client.findOrCreateSlackThread({
    workspace,
    channel,
    threadTs,
    create: false,
  });
  if (!thread) {
    return undefined;
  }
  const { investigation_id: id, title } = thread;
  const investigation = await client.get(id);
  return { id, title, status: investigation.status, summary: investigation.summary };
};
