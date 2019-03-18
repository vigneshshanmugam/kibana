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
import { DashboardDrilldownAction } from './dashboard_drilldown_action';
import { DashboardDrilldownEditor } from './dashboard_drilldown_editor';

export const DASHBOARD_DRILLDOWN_ACTION = 'DASHBOARD_DRILLDOWN_ACTION';

export class DashboardDrilldownActionFactory extends ActionFactory {
  constructor() {
    super({ id: DASHBOARD_DRILLDOWN_ACTION, title: 'Drill down to a dashboard' });
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
      <DashboardDrilldownEditor config={config} onChange={onChange} />,
      domNode
    );
  }

  public showParameterization() {
    return false;
  }

  public async createNew() {
    return addAction(new DashboardDrilldownAction());
  }

  public fromSavedObject(actionSavedObject: ActionSavedObject) {
    return new DashboardDrilldownAction(actionSavedObject);
  }
}
