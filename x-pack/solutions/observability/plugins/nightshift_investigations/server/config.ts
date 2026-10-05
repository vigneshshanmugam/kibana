/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';

const sandboxConfigSchema = schema.object({
  /**
   * Id of the preconfigured connector holding the Elasticsearch URL and API key the sandbox
   * queries telemetry with. It is added to the investigator's connector allow-list; credentials
   * are injected per command, only when the agent asks for it.
   */
  telemetry_connector_id: schema.maybe(schema.string()),
  // Operator-supplied readable index patterns and remote names for the telemetry manifest.
  telemetry_readable_indices: schema.maybe(schema.string({ maxLength: 10_000 })),
});

const cortexConfigSchema = schema.object({
  /**
   * Governs Cortex end to end: the hydrate/optimize hooks on the investigator agent, the Cortex
   * HTTP routes, and the Cortex tab in the significant events app, which reads this flag through
   * the routes below.
   */
  enabled: schema.boolean({ defaultValue: true }),
});

const decisionTreesConfigSchema = schema.object({
  // Governs the decision-tree reinforcement agent end to end: the post-execution hook on the
  // investigator, the hydrate step that materializes trees into the sandbox, the agent's own
  // tools, the decision-tree AI index, and the Decision Trees tab in the significant events app.
  // Trees are edited in the sandbox and read the Cortex investigator context, so this still
  // requires cortex.enabled (and sandbox) at runtime.
  enabled: schema.boolean({ defaultValue: true }),
});

const memoryConfigSchema = schema.object({
  // Governs Semantic Memory independently of Cortex: index ensure, hydrate/
  // optimize hooks on the deductive agent, and the matching managed workflows.
  enabled: schema.boolean({ defaultValue: false }),
});

const slackIntakeConfigSchema = schema.object({
  // Routes Slack messages with the TypeSafe decision model, under the Nightshift feature flag.
  // Without a key the intake is skipped and the Slack thread workflow behaves as without a model.
  // With a key, each message's text and the linked investigation's title, status and summary
  // excerpt are sent to the TypeSafe endpoint.
  // Explicit TypeSafe API key; a stopgap until the model is served through EIS.
  api_key: schema.maybe(schema.string({ maxLength: 1024 })),
  // TypeSafe-compatible endpoint (for example a self-hosted Kev). Defaults to the hosted API.
  base_url: schema.maybe(schema.string({ maxLength: 2048 })),
  model: schema.maybe(schema.string({ maxLength: 128 })),
  timeout_ms: schema.number({ defaultValue: 5_000, min: 500, max: 30_000 }),
  // Minimum probability of a non-ignore route before the gate counts it as one it would act on.
  act_threshold: schema.number({ defaultValue: 0.8, min: 0, max: 1 }),
});

const configSchema = schema.object({
  // Reserved: Core skips loading this plugin entirely when false.
  enabled: schema.boolean({ defaultValue: true }),
  sandbox: schema.maybe(sandboxConfigSchema),
  cortex: cortexConfigSchema,
  decision_trees: decisionTreesConfigSchema,
  memory: memoryConfigSchema,
  slack_intake: slackIntakeConfigSchema,
});

export type NightshiftInvestigationsConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<NightshiftInvestigationsConfig> = {
  schema: configSchema,
};
