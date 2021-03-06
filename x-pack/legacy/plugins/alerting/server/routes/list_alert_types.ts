/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

export const listAlertTypesRoute = {
  method: 'GET',
  path: `/api/alert/types`,
  config: {
    tags: ['access:alerting-read'],
  },
  async handler(request: Hapi.Request) {
    return request.server.plugins.alerting!.start.listTypes();
  },
};
