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
import { ActionFactory, ActionSavedObject, addAction, AnyAction } from 'ui/embeddable';
// @ts-ignore
import { interpretAst } from '../../../interpreter/public/interpreter';
import { NavigateAction } from './navigate_action';
import { NavigateActionEditor } from './navigate_action_editor';

export const NAVIGATE_ACTION_TYPE = 'navigateActionType';

export class NavigateActionFactory extends ActionFactory {
  constructor() {
    super({ id: NAVIGATE_ACTION_TYPE, title: 'Custom Navigation Action' });
  }

  public isCompatible() {
    return Promise.resolve(true);
  }

  public async renderEditor(
    domNode: React.ReactNode,
    config: string,
    onChange: (config: string) => void
  ) {
    ReactDOM.render(
      // @ts-ignore
      <NavigateActionEditor config={config} onChange={onChange} />,
      domNode
    );
  }

  public async createNew() {
    return addAction(new NavigateAction());
  }

  public fromSavedObject(actionSavedObject: ActionSavedObject) {
    return new NavigateAction(actionSavedObject);
  }
}
