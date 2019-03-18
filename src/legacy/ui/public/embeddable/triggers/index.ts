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

export { triggerRegistry } from './trigger_registry';
export { Trigger } from './trigger';
export { TriggerSavedObject } from './trigger_saved_object';
export * from './trigger_helpers';

export const SHOW_VIEW_MODE_TRIGGER = 'VIEW_MODE_MENU';
export const SHOW_EDIT_MODE_TRIGGER = 'EDIT_MODE_MENU';
export const APPLY_FILTER_TRIGGER = 'FITLER_TRIGGER';

import chrome from 'ui/chrome';
import { TriggerSavedObjectAttributes } from 'ui/embeddable/triggers/trigger_saved_object';
import { APPLY_FILTER_ACTION } from '../../../../core_plugins/embeddable_actions/public/apply_filter/apply_filter_factory';
import { Trigger } from './trigger';
import { addTrigger } from './trigger_helpers';

async function seedGlobalTriggers() {
  try {
    addTrigger(new Trigger({ id: SHOW_VIEW_MODE_TRIGGER, title: 'View menu items' }));

    chrome.getSavedObjectsClient().create<TriggerSavedObjectAttributes>(
      'ui_trigger',
      {
        actions: '',
      },
      { id: SHOW_EDIT_MODE_TRIGGER }
    );

    chrome.getSavedObjectsClient().create<TriggerSavedObjectAttributes>(
      'ui_trigger',
      {
        actions: `${APPLY_FILTER_ACTION}`,
      },
      { id: APPLY_FILTER_TRIGGER }
    );
    chrome.getSavedObjectsClient().create<TriggerSavedObjectAttributes>(
      'ui_trigger',
      {
        actions: ``,
      },
      { id: 'SEARCH_ROW_CLICK_TRIGGER' }
    );
  } catch (e) {
    return;
  }
}

seedGlobalTriggers();
