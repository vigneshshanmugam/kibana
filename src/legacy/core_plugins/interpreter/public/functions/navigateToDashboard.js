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




import chrome from 'ui/chrome';

export const navigateToDashboard = () => ({
  name: 'navigateToDashboard',
  help:
    'Use the browser\'s location functionality to get your current location. Usually quite slow, but fairly accurate',
  args: {
    id: {
      aliases: ['_'],
      types: ['string'],
      help: 'A markdown expression. You can pass this multiple times to achieve concatenation',
      default: '2',
    },
    filterName: {
      types: ['string'],
      help: 'A markdown expression. You can pass this multiple times to achieve concatenation',
    },
  },
  fn: (context, args) => {
    const id = args.id;
    const name = args.filterName;
    const value = context.value.filter.series.label;
    const basePath = chrome.getBasePath();
    const location =
      `http://localhost:5601${basePath}/app/kibana#/dashboard/${id}` +
      `?_g=(refreshInterval:(pause:!f,value:900000),time:(from:now-24h,mode:quick,to:now))&` +
      `_a=(query:(language:lucene,query:'${name}:${value}'))`;

    window.location.href = location;
    return context;
  },
});
