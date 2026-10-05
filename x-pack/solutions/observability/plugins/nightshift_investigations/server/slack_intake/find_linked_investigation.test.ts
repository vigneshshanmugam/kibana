/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findLinkedInvestigation } from './find_linked_investigation';

const thread = { workspace: 'T1', channel: 'C1', threadTs: '100.1' };

describe('findLinkedInvestigation', () => {
  it("returns the thread's investigation with the state the router sees", async () => {
    const findOrCreateSlackThread = jest
      .fn()
      .mockResolvedValue({ investigation_id: 'inv-2', title: 'T' });
    const get = jest.fn().mockResolvedValue({ status: 'running', summary: 'S' });

    await expect(
      findLinkedInvestigation({ findOrCreateSlackThread, get }, thread)
    ).resolves.toEqual({ id: 'inv-2', title: 'T', status: 'running', summary: 'S' });
    expect(findOrCreateSlackThread).toHaveBeenCalledWith({ ...thread, create: false });
    expect(get).toHaveBeenCalledWith('inv-2');
  });

  it('returns undefined without creating anything when the thread has no investigation', async () => {
    const findOrCreateSlackThread = jest.fn().mockResolvedValue(undefined);
    const get = jest.fn();

    await expect(
      findLinkedInvestigation({ findOrCreateSlackThread, get }, thread)
    ).resolves.toBeUndefined();
    expect(get).not.toHaveBeenCalled();
  });
});
