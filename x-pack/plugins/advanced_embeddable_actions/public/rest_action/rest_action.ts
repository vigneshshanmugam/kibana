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

import { Action } from 'ui/embeddable/actions';
import { ExecuteOptions } from 'ui/embeddable/actions/action';

// @ts-ignore
import { fromExpression } from '@kbn/interpreter/common';
import React from 'react';
import { AnyEmbeddable } from 'ui/embeddable';
import { kfetch } from 'ui/kfetch';
import { ActionSavedObject } from '../../embeddable_action_editor/public/app/action_saved_object';
// @ts-ignore
import { interpretAst } from '../../interpreter/public/interpreter';
import {
  DashboardContainer,
  DashboardEmbeddable,
} from '../../kibana/public/dashboard/embeddables/dashboard_container';
import { REST_ACTION_TYPE } from './rest_action_factory';

export class RestAction extends Action<any, any, any> {
  public embeddableMapping: { [key: string]: string } = {};
  public containerMapping: { [key: string]: string } = {};
  public urlTemplate: string = '';

  constructor(actionSavedObject: ActionSavedObject) {
    super({ id: actionSavedObject.id, displayName: actionSavedObject.attributes.title });

    if (actionSavedObject.attributes.configuration !== '') {
      const { embeddableMapping, containerMapping, urlTemplate } = JSON.parse(
        actionSavedObject.attributes.configuration
      );
      this.embeddableMapping = embeddableMapping;
      this.containerMapping = containerMapping;
      this.urlTemplate = urlTemplate;
    }
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

  public toSavedObject(): ActionSavedObject {
    const attributes = {
      title: this.displayName,
      configuration: JSON.stringify({
        urlTemplate: this.urlTemplate,
        embeddableMapping: this.embeddableMapping,
        containerMapping: this.containerMapping,
      }),
      type: REST_ACTION_TYPE,
    };
    return {
      type: 'ui_action',
      id: this.id,
      attributes,
    };
  }

  public execute({
    embeddable,
    container,
  }: ExecuteOptions<DashboardEmbeddable, DashboardContainer>) {
    const url = this.createUrlFromTemplate({
      embeddable,
      container,
    });
    kfetch({
      method: 'GET',
      pathname: url,
    });
  }

  private createUrlFromTemplate({
    embeddable,
    container,
  }: ExecuteOptions<DashboardEmbeddable, DashboardContainer>) {
    let url = this.injectTemplateParameters(this.embeddableMapping, this.urlTemplate, embeddable);
    url = this.injectTemplateParameters(this.containerMapping, url, container);
    return url;
  }

  private flatten(shape: { [key: string]: any }, prefix = '') {
    let output: { [key: string]: string } = {};
    Object.keys(shape).map(key => {
      const value = shape[key];
      if (Array.isArray(value) || typeof value === 'object') {
        output = {
          ...output,
          ...this.flatten(shape[key], prefix + key + '.'),
        };
      } else {
        output[prefix + key] = value;
      }
    });
    return output;
  }

  private injectTemplateParameters(
    mapping: { [key: string]: string },
    url: string,
    embeddable: AnyEmbeddable
  ) {
    let finalUrl = url;
    const embeddableOutput = { ...embeddable.getOutput() };
    delete embeddableOutput.indexPatterns;
    const flattenedOutput = this.flatten(embeddableOutput);
    Object.keys(mapping).forEach(name => {
      const path = mapping[name];
      const replaceValue = `\$\{${name}\}`;
      finalUrl = finalUrl.replace(replaceValue, flattenedOutput[path]);
    });
    return finalUrl;
  }
}
