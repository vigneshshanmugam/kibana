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
import { EuiButton } from '@elastic/eui';
import {
  DASHBOARD_CONTAINER_TYPE,
  DashboardContainer,
  DashboardContainerFactory,
} from 'plugins/dashboard_embeddable';
import React from 'react';
import { EmbeddableFactory } from 'ui/embeddable';
import { dashboardInput } from './dashboard_input';

export interface Props {
  getEmbeddableFactory: <I, O>(type: string) => EmbeddableFactory<I, O> | undefined;
}

export class DashboardContainerExample extends React.Component<Props, { viewMode: string }> {
  private mounted = false;
  private dashboardEmbeddableRoot: React.RefObject<HTMLDivElement>;
  private dashboardContainer: DashboardContainer | undefined;

  public constructor(props: Props) {
    super(props);
    this.state = {
      viewMode: 'view',
    };

    this.dashboardEmbeddableRoot = React.createRef();
  }

  public async componentDidMount() {
    this.mounted = true;
    const dashboardFactory = this.props.getEmbeddableFactory(
      DASHBOARD_CONTAINER_TYPE
    ) as DashboardContainerFactory;
    dashboardFactory.setGetEmbeddableFactory(this.props.getEmbeddableFactory);
    if (dashboardFactory) {
      this.dashboardContainer = await dashboardFactory.create({ id: '123' }, dashboardInput);
      if (this.mounted && this.dashboardContainer) {
        this.dashboardContainer.render(this.dashboardEmbeddableRoot.current);
      }
    }
  }

  public componentWillUnmount() {
    this.mounted = false;
    if (this.dashboardContainer) {
      this.dashboardContainer.destroy();
    }
  }

  public switchViewMode = () => {
    this.setState(prevState => {
      if (!this.dashboardContainer) {
        return;
      }
      const newMode = prevState.viewMode === 'view' ? 'edit' : 'view';
      const newState = _.cloneDeep(this.dashboardContainer.getOutput());
      newState.viewMode = newMode;
      this.dashboardContainer.onInputChanged(newState);
      return { viewMode: newMode };
    });
  };

  public render() {
    return (
      <div className="app-container dshAppContainer">
        <h1>Embeddable Exploration. Here is a Dashboard Embeddable Container:</h1>
        <p>
          This is a dashboard container rendered using the Embeddable API. It is passed a static
          time range. Available actions to take on the dashboard are not being rendered because it's
          up to the container to decide how to render them.
        </p>
        <p>
          This dashboard is not tied to a dashboard saved object, but it is tied to visualization
          saved objects, so they must exist for this to render properly.
        </p>
        <EuiButton onClick={this.switchViewMode}>
          {this.state.viewMode === 'view' ? 'Edit' : 'View'}
        </EuiButton>
        <div id="dashboardViewport" ref={this.dashboardEmbeddableRoot} />
      </div>
    );
  }
}
