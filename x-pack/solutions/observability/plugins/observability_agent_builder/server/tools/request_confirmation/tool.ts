/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';

export const OBSERVABILITY_REQUEST_CONFIRMATION_TOOL_ID = 'observability.request_confirmation';

const requestConfirmationSchema = z.object({
  prompt_id: z
    .string()
    .describe(
      'Stable identifier for this confirmation. Use a short descriptive string like "rollback-payment-service". Must be the same value on every call for the same action.'
    ),
  title: z.string().describe('Short title shown to the engineer, e.g. "Roll back payment-service"'),
  message: z
    .string()
    .describe(
      'Full explanation of what will happen: the action, exact parameters, expected outcome, and risk level. This is what the engineer reads before deciding.'
    ),
});

export function createRequestConfirmationTool(): StaticToolRegistration<
  typeof requestConfirmationSchema
> {
  const toolDefinition: BuiltinToolDefinition<typeof requestConfirmationSchema> = {
    id: OBSERVABILITY_REQUEST_CONFIRMATION_TOOL_ID,
    type: ToolType.builtin,
    description: `Pauses execution and asks the engineer to confirm before proceeding with a remediation action.

Call this tool BEFORE calling any workflow or connector tool. Do not call the workflow tool until this tool returns "accepted".

Returns:
- "accepted": engineer approved, proceed with the action
- "rejected": engineer declined, do not proceed, summarise the current state instead`,
    schema: requestConfirmationSchema,
    tags: ['observability', 'remediation'],
    handler: async ({ prompt_id, title, message }, { prompts }) => {
      const { status } = prompts.checkConfirmationStatus(prompt_id);

      if (status === ConfirmationStatus.unprompted) {
        return prompts.askForConfirmation({
          id: prompt_id,
          title,
          message,
          confirm_text: 'Proceed',
          cancel_text: 'Cancel',
        });
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              status: status === ConfirmationStatus.accepted ? 'accepted' : 'rejected',
            },
          },
        ],
      };
    },
  };

  return toolDefinition;
}
