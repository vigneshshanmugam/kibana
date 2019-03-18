/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

export const advancedEmbeddableActions = (kibana: any) => {
  return new kibana.Plugin({
    id: 'advanced_embeddable_actions',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'xpack_main'],
    uiExports: {
      embeddableActions: ['plugins/advanced_embeddable_actions/actions'],
    },
  });
};
