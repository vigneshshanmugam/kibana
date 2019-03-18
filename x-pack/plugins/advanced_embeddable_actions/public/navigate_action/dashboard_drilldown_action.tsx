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
import rison from 'rison-node';
import { Action, ActionSavedObject } from 'ui/embeddable';
import { ExecuteOptions } from 'ui/embeddable/actions/action';
import url from 'url';

// @ts-ignore
import { fromExpression } from '@kbn/interpreter/common';
import chrome from 'ui/chrome';
import { AnyEmbeddable } from 'ui/embeddable';
import { TimeRange } from 'ui/visualize';
// @ts-ignore
import { interpretAst } from '../../interpreter/public/interpreter';
import { DASHBOARD_DRILLDOWN_ACTION } from './dashboard_drilldown_action_factory';

interface PartialParsedConfig {
  dashboardId?: string;
  addDynamicFilters?: boolean;
  staticQuery?: string;
  useDynamicTimeRange?: boolean;
  inNewTab?: boolean;
  staticTimeRange?: TimeRange;
}

export interface ParsedConfig {
  dashboardId: string;
  addDynamicFilters: boolean;
  staticQuery?: string;
  useDynamicTimeRange: boolean;
  inNewTab: boolean;
  staticTimeRange?: TimeRange;
}

export function getUpdatedConfiguration(
  config: string,
  {
    dashboardId,
    addDynamicFilters,
    staticQuery,
    useDynamicTimeRange,
    inNewTab,
    staticTimeRange,
  }: PartialParsedConfig
) {
  const existingParams = JSON.parse(config);
  if (dashboardId) {
    existingParams.dashboardId = dashboardId;
  }

  if (addDynamicFilters) {
    existingParams.addDynamicFilters = addDynamicFilters;
  }

  if (staticQuery) {
    existingParams.staticQuery = staticQuery;
  }

  if (useDynamicTimeRange) {
    existingParams.useDynamicTimeRange = useDynamicTimeRange;
  }

  if (inNewTab) {
    existingParams.inNewTab = inNewTab;
  }

  if (staticTimeRange) {
    existingParams.staticTimeRange = staticTimeRange;
  }

  return JSON.stringify(existingParams);
}

export class DashboardDrilldownAction extends Action<any, any, any> {
  public dashboardId: string = '';
  public inNewTab: boolean = false;
  public addDynamicFilters: boolean = false;
  public staticQuery?: string;
  public useDynamicTimeRange: boolean = false;
  public staticTimeRange?: TimeRange;

  constructor(actionSavedObject?: ActionSavedObject) {
    super({
      actionSavedObject,
      type: DASHBOARD_DRILLDOWN_ACTION,
    });

    if (actionSavedObject && actionSavedObject.attributes.configuration !== '') {
      this.updateConfiguration(actionSavedObject.attributes.configuration);
    }
  }

  public isCompatible() {
    return Promise.resolve(true);
  }

  public updateConfiguration(config: string) {
    const {
      dashboardId,
      addDynamicFilters,
      staticQuery,
      useDynamicTimeRange,
      inNewTab,
      staticTimeRange,
    } = JSON.parse(config);
    this.dashboardId = dashboardId;
    this.staticTimeRange = staticTimeRange;
    this.useDynamicTimeRange = useDynamicTimeRange;
    this.addDynamicFilters = addDynamicFilters;
    this.staticQuery = staticQuery;
    this.inNewTab = inNewTab;
  }

  public getConfiguration() {
    return JSON.stringify({
      inNewTab: this.inNewTab,
      dashboardId: this.dashboardId,
      addDynamicFilters: this.addDynamicFilters,
      staticQuery: this.staticQuery,
      useDynamicTimeRange: this.useDynamicTimeRange,
      staticTimeRange: this.staticTimeRange,
    });
  }

  public execute({ embeddable, triggerContext }: ExecuteOptions<AnyEmbeddable, AnyEmbeddable>) {
    const query: { [key: string]: string } = {};
    if (this.addDynamicFilters) {
      query.addFilters = rison.encode(triggerContext.filters);
    }

    if (this.staticQuery) {
      query.staticQuery = rison.encode(this.staticQuery);
    }

    if (this.staticTimeRange) {
      query.timeRange = rison.encode(this.staticTimeRange);
    }

    const basePath = chrome.getBasePath();

    const queryStr = Object.keys(query)
      .map(key => `${key}=${query[key]}`)
      .join('&');
    const url = `${basePath}/app/kibana#/dashboard/${this.dashboardId}?${queryStr}`;
    window.open(url, this.inNewTab ? '_blank' : '');
  }
}
