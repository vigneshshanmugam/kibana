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

import { PanelActionAPI } from 'ui/embeddable/context_menu_actions/types';
import { ActionFactory } from './action_factory';

class ActionFactoryRegistry {
  private actionFactories: { [key: string]: ActionFactory } = {};

  public registerActionFactory(action: ActionFactory) {
    console.log('Adding action factory for ' + action.id);
    this.actionFactories[action.id] = action;
  }

  public getFactoryById(id: string) {
    return this.actionFactories[id];
  }

  public getCompatibleFactories(panelAPI: PanelActionAPI<any, any>) {
    return Object.values(this.actionFactories).filter((actionFactory: ActionFactory) => {
      return actionFactory.isCompatible(panelAPI);
    });
  }

  public getFactories() {
    return this.actionFactories;
  }
}

console.log('ACTION FACTORY REGISTRY INITIALIZED');
export const actionFactoryRegistry = new ActionFactoryRegistry();
