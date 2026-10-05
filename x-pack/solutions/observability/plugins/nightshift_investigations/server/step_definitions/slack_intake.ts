/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { SlackIntakeDecider } from '../slack_intake/decide_route';
import { findLinkedInvestigation } from '../slack_intake/find_linked_investigation';
import type { GetInvestigationsClient } from '../routes/types';
import {
  runSlackIntake,
  slackIntakeInputSchema,
  slackIntakeOutputSchema,
} from '../slack_intake/run_intake';

/**
 * Routes a Slack message with the decision model; the output is also the decision log, kept with
 * the workflow execution. A failed decision never fails the step.
 */
export const slackIntakeStepDefinition = ({
  decide,
  getInvestigationsClient,
  logger,
}: {
  decide: SlackIntakeDecider;
  getInvestigationsClient: GetInvestigationsClient;
  logger: Logger;
}) =>
  createServerStepDefinition({
    id: 'nightshift.slackIntake',
    label: 'Nightshift Slack Intake',
    category: StepCategory.Ai,
    description:
      'Decide where a Slack message should go: ignore, answer directly, start an investigation, or follow up on one. The thread workflow acts on the `action` output.',
    inputSchema: slackIntakeInputSchema,
    outputSchema: slackIntakeOutputSchema,
    handler: async (context) => {
      const input = slackIntakeInputSchema.parse(context.input);
      // Same identity and space handling as `nightshift.triggerInvestigation`.
      const request = context.contextManager.getFakeRequest();
      const { spaceId } = context.contextManager.getContext().workflow;
      const client = getInvestigationsClient(request, spaceId);
      return {
        output: await runSlackIntake({
          decide,
          findLinkedInvestigation: (thread) => findLinkedInvestigation(client, thread),
          input,
          logger,
        }),
      };
    },
  });
