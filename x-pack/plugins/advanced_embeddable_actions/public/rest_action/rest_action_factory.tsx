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

// @ts-ignore
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import React from 'react';
import ReactDOM from 'react-dom';
import { ActionFactory } from 'ui/embeddable/actions/action_factory';
import { ActionSavedObject } from '../../../embeddable_action_editor/public/app/action_saved_object';
// @ts-ignore
import { interpretAst } from '../../../interpreter/public/interpreter';
import {
  DashboardContainer,
  DashboardEmbeddable,
} from '../../../kibana/public/dashboard/embeddables/dashboard_container';
import { RestAction } from './rest_action';
import { RestActionEditor } from './rest_action_editor';

export const REST_ACTION_TYPE = 'restActionType';

export class RestActionFactory extends ActionFactory {
  constructor() {
    super({ id: REST_ACTION_TYPE, displayName: 'Custom REST Action' });
  }

  public isCompatible({
    embeddable,
    container,
  }: {
    embeddable: DashboardEmbeddable;
    container: DashboardContainer;
  }) {
    return Promise.resolve(true);
  }

  public async renderEditor(domNode: React.ReactNode, actionSavedObject: ActionSavedObject) {
    // @ts-ignore
    ReactDOM.render(
      <RestActionEditor
        actionSavedObject={actionSavedObject}
        getConfiguration={this.getConfiguration}
      />,
      domNode
    );
  }

  private getConfiguration() {
    
  }

  public async create(actionSavedObject: ActionSavedObject): Promise<RestAction | undefined> {
    const restAction = new RestAction(actionSavedObject);
    return Promise.resolve(restAction);
  }
}
