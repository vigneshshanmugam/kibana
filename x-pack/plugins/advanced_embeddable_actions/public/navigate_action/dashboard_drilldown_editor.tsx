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

import { EuiFieldText, EuiForm, EuiFormRow, EuiSelect, EuiSwitch } from '@elastic/eui';
import React, { Component } from 'react';
import chrome from 'ui/chrome';
import {
  DashboardDrilldownAction,
  getUpdatedConfiguration,
  ParsedConfig,
} from './dashboard_drilldown_action';

interface Props {
  config: string;
  onChange: (config: string) => void;
}

interface State {
  dashboardOptions: Array<{ text: string; value: string }>;
}

export class DashboardDrilldownEditor extends Component<Props, State> {
  private parsedConfig: ParsedConfig;
  constructor(props: Props) {
    super(props);

    this.state = {
      dashboardOptions: [],
    };
  }

  public async componentDidMount() {
    const savedObjectClient = chrome.getSavedObjectsClient();
    const response = await savedObjectClient.find({ type: 'dashboard' });
    const dashboardOptions: Array<{ text: string; value: string }> = [];
    response.savedObjects.forEach(dashboard => {
      dashboardOptions.push({ text: dashboard.attributes.title, value: dashboard.id });
    });
    this.setState({ dashboardOptions });
  }

  public render() {
    const {
      dashboardId,
      addDynamicFilters,
      staticQuery,
      useDynamicTimeRange,
      inNewTab,
      staticTimeRange,
    } = JSON.parse(this.props.config);
    return (
      <EuiForm>
        <EuiFormRow label="Dashboard">
          <EuiSelect
            options={this.state.dashboardOptions}
            value={dashboardId}
            onChange={this.changeDashboard}
          />
        </EuiFormRow>

        <EuiFormRow label="Apply a static query">
          <EuiFieldText name="Static Query" onChange={this.setStaticQuery} value={staticQuery} />
        </EuiFormRow>

        <EuiFormRow label="Use dynamic filters from trigger">
          <EuiSwitch
            name="Use dynamic filters"
            label="Use dynamic filters"
            checked={addDynamicFilters}
            onChange={() => this.toggleAddDynamicFilters(addDynamicFilters)}
          />
        </EuiFormRow>
      </EuiForm>
    );
  }

  private toggleAddDynamicFilters = (currentValue: boolean) => {
    this.props.onChange(
      getUpdatedConfiguration(this.props.config, { addDynamicFilters: !currentValue })
    );
  };

  private changeDashboard = (e: any) => {
    this.props.onChange(
      getUpdatedConfiguration(this.props.config, { dashboardId: e.target.value })
    );
  };

  private setStaticQuery = (e: any) => {
    this.props.onChange(
      getUpdatedConfiguration(this.props.config, { staticQuery: e.target.value })
    );
  };
}
