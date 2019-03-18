/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Legacy } from 'kibana';
// @ts-ignore
import { injectVars } from '../kibana/inject_vars';
// @ts-ignore
import mappings from './mappings.json';
import { Plugin as EmbeddableExplorer } from './plugin';
import { createShim } from './shim';

export type CoreShim = object;

// tslint:disable-next-line
export default function(kibana: any) {
  return new kibana.Plugin({
    require: ['kibana'],
    uiExports: {
      app: {
        title: 'Action Editor',
        order: 1,
        main: 'plugins/embeddable_action_editor',
      },

      mappings: { ...mappings },
    },
    init(server: Legacy.Server) {
      const embeddableExplorer = new EmbeddableExplorer(server);
      embeddableExplorer.start(createShim());

      // @ts-ignore
      server.injectUiAppVars('embeddable_action_editor', () => injectVars(server));
    },
  });
}
