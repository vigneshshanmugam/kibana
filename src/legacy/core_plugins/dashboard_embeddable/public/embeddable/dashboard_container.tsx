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

import React from 'react';
import ReactDOM from 'react-dom';
import {
  Container,
  Embeddable,
  EmbeddableFactory,
  Filter,
  Query,
  RefreshConfig,
  ViewMode,
} from 'ui/embeddable';
import { TimeRange } from 'ui/timefilter/time_history';

import { I18nProvider } from '@kbn/i18n/react';
import { DASHBOARD_CONTAINER_TYPE } from './dashboard_container_factory';
import { PanelState, PanelStateMap } from './types';
// @ts-ignore
import { DashboardViewport } from './viewport/dashboard_viewport';

export interface DashboardInput {
  viewMode: ViewMode;
  panels: {
    [key: string]: PanelState;
  };
  filters: Filter[];
  hidePanelTitles: boolean;
  query: Query;
  timeRange: TimeRange;
  refreshConfig: RefreshConfig;
  expandedPanelId?: string;
  useMargins: boolean;
  title: string;
  description: string;
  isFullScreenMode: boolean;
}

export interface DashboardEmbeddableInput {
  customTitle?: string;
  embeddableCustomization: any;
  filters: Filter[];
  hidePanelTitles: boolean;
  isPanelExpanded: boolean;
  query: Query;
  timeRange: TimeRange;
  refreshConfig: RefreshConfig;
  viewMode: ViewMode;
}

export interface DashboardEmbeddableOutput {
  customization: any;
  title: string;
  actionContext: {
    clickContext?: Filter[];
  };
}

export type DashboardContainerOutput = DashboardInput;

export type DashboardEmbeddable = Embeddable<DashboardEmbeddableInput, DashboardEmbeddableOutput>;

export class DashboardContainer extends Container<
  DashboardInput,
  DashboardContainerOutput,
  DashboardEmbeddableInput
> {
  constructor(
    { id }: { id: string },
    initialInput: DashboardInput,
    private getEmbeddableFactory: <I, O>(type: string) => EmbeddableFactory<I, O> | undefined
  ) {
    super({ type: DASHBOARD_CONTAINER_TYPE, id }, initialInput, initialInput);
  }

  public onToggleExpandPanel(id: string) {
    const newValue = this.input.expandedPanelId ? undefined : id;
    this.onInputChanged({
      ...this.input,
      expandedPanelId: newValue,
    });
  }

  public onInputChanged(input: DashboardInput) {
    const changed = !_.isEqual(this.input, input);
    if (changed) {
      console.log(
        'DASHBOARD_CONTAINER: input changed, pushign to embeddables, filters are',
        JSON.stringify(input.filters)
      );
      this.input = input;
      this.emitOutputChanged(input);
      Object.values(this.embeddables).forEach(
        (embeddable: Embeddable<DashboardEmbeddableInput, {}>) => {
          embeddable.onInputChanged(this.getInputForEmbeddable(embeddable.id));
        }
      );
    }
  }

  public onPanelsUpdated = (panels: PanelStateMap) => {
    this.onInputChanged({
      ...this.input,
      panels: {
        ...panels,
      },
    });
  };

  public onExitFullScreenMode = () => {
    this.onInputChanged({
      ...this.input,
      isFullScreenMode: false,
    });
  };

  public addEmbeddable(embeddable: DashboardEmbeddable) {
    embeddable.setContainer(this);
    embeddable.onOutputChanged((embeddableState: DashboardEmbeddableOutput) => {
      this.onInputChanged({
        ...this.input,
        panels: {
          ...this.input.panels,
          [embeddable.id]: {
            ...this.input.panels[embeddable.id],
            embeddableConfig: {
              ...embeddableState.customization,
            },
          },
        },
      });
    });

    this.embeddables[embeddable.id] = embeddable;
    embeddable.onInputChanged(this.getInputForEmbeddable(embeddable.id));
  }

  public removeEmbeddable(embeddable: DashboardEmbeddable) {
    this.embeddables[embeddable.id].destroy();
    delete this.embeddables[embeddable.id];

    const changedInput = _.cloneDeep(this.input);
    delete changedInput.panels[embeddable.id];
    this.onInputChanged(changedInput);
  }

  public render(dom: React.ReactNode) {
    ReactDOM.render(
      // @ts-ignore
      <I18nProvider>
        <DashboardViewport
          getEmbeddableFactory={this.getEmbeddableFactory}
          container={this}
          onPanelsUpdated={this.onPanelsUpdated}
          useMargins={this.output.useMargins}
          maximizedPanelId={this.output.expandedPanelId}
          panelCount={Object.values(this.output.panels).length}
          title={this.output.title}
          description={this.output.description}
          isFullScreenMode={this.output.isFullScreenMode}
          onExitFullScreenMode={this.onExitFullScreenMode}
        />
      </I18nProvider>,
      dom
    );
  }

  public getInputForEmbeddable(embeddableId: string) {
    const panel = Object.values(this.output.panels).find(
      panel => panel.panelIndex === embeddableId
    );
    if (!panel) {
      throw new Error('No panel at id ' + embeddableId);
    }
    const isPanelExpanded = this.output.expandedPanelId === embeddableId;
    const { viewMode, refreshConfig, timeRange, query, hidePanelTitles, filters } = this.output;
    return {
      customTitle: panel.title,
      embeddableCustomization: {
        ...panel.embeddableConfig,
      },
      filters,
      hidePanelTitles,
      isPanelExpanded,
      query,
      timeRange,
      refreshConfig,
      viewMode,
      ...panel.embeddableConfig,
    };
  }
}
