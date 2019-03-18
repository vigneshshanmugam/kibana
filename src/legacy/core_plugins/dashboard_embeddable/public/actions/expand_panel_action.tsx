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

import {
  Action,
  actionRegistry,
  Embeddable,
  PanelActionAPI,
  SHOW_VIEW_MODE_TRIGGER,
  triggerRegistry,
  ViewMode,
} from 'ui/embeddable';
import { DASHBOARD_CONTAINER_TYPE, DashboardContainer } from '../embeddable';
import { DashboardEmbeddable } from '../embeddable/dashboard_container';

export const EXPAND_PANEL_ACTION = 'EXPAND_PANEL_ACTION';

export class ExpandPanelAction extends Action {
  constructor() {
    super({
      type: 'EXPAND_PANEL_ACTION',
    });

    this.id = EXPAND_PANEL_ACTION;
    this.title = 'Expand panel';
  }

  public getTitle({
    embeddable,
    container,
  }: {
    embeddable: Embeddable;
    container: DashboardContainer;
  }) {
    return container.getOutput().expandedPanelId ? 'Minimize' : 'Expand';
  }

  public getIcon({ embeddable, container }: PanelActionAPI): string | undefined {
    return;
  }

  public isCompatible({
    embeddable,
    container,
  }: {
    embeddable: Embeddable;
    container: DashboardContainer;
  }) {
    return Promise.resolve(
      container.type === DASHBOARD_CONTAINER_TYPE &&
        container.getOutput().viewMode === ViewMode.EDIT &&
        container.getOutput().expandedPanelId !== embeddable.id
    );
  }

  public execute({
    embeddable,
    container,
  }: {
    embeddable: DashboardEmbeddable;
    container: DashboardContainer;
  }) {
    container.onToggleExpandPanel(embeddable.id);
  }
}

actionRegistry.addAction(new ExpandPanelAction());

triggerRegistry.addDefaultAction({
  triggerId: SHOW_VIEW_MODE_TRIGGER,
  actionId: EXPAND_PANEL_ACTION,
});
