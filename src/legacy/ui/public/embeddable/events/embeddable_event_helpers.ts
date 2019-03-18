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

export async function addAction(action: Action): Promise<Action> {
  const savedObjectsClient = chrome.getSavedObjectsClient();
  let actionSavedObject: ActionSavedObject;
  if (action.id) {
    actionSavedObject = await savedObjectsClient.create(
      'ui_action',
      action.getSavedObjectAttributes(),
      {
        id: action.id,
      }
    );
  } else {
    actionSavedObject = await savedObjectsClient.create(
      'ui_action',
      action.getSavedObjectAttributes()
    );
  }

  return fromSavedObject(actionSavedObject);
}

export async function getEvent(
  id: string
): Promise<EmbeddableEvent | { message: string; statusCode: number }> {
  const savedObjectsClient = chrome.getSavedObjectsClient();
  const response = await savedObjectsClient.get<ActionSavedObjectAttributes>('ui_action', id);
  if (response.error) {
    return Promise.resolve(response.error);
  }

  return actionFactoryRegistry.getFactoryById(response.attributes.type).fromSavedObject(response);
}

export async function saveAction(action: Action) {
  if (!action.id) {
    const newAction = await addAction(action);
    action.id = newAction.id;
  } else {
    chrome
      .getSavedObjectsClient()
      .update('ui_action', action.id, action.getSavedObjectAttributes());
  }
}

export async function deleteAction(id: string) {
  chrome.getSavedObjectsClient().delete('ui_action', id);
}
