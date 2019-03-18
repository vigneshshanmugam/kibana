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




export const injectQueryValue = () => ({
  name: 'injectQueryValue',
  aliases: [],
  args: {
    string: {
      type: 'string',
    },
  },
  fn(context, args) {
    const str = args.string;
    const filterName = Object.keys(context[0].query.match)[0];
    const newValue = context[0].query.match[filterName].query;
    const newUrl = str.replace(/query:\(match:\(.*:\(query:.*,type:phrase\)\)\)\)\)/gi, `query:(match:(${filterName}:(query:${newValue},type:phrase)))))`);

    const ret = {
      type: 'any',
      value: {
        ...context.value,
        url: newUrl
      },
    };
    console.log('injectContext ret is:', ret);
    return ret;
  },
});
