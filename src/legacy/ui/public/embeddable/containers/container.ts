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

import { ViewMode } from 'ui/embeddable/types';
import { Embeddable } from '../embeddables';

export interface ContainerInput {
  hidePanelTitles?: boolean;
  viewMode?: ViewMode;
}

export interface ContainerOutput {
  hidePanelTitles: boolean;
  viewMode: ViewMode;
}

export abstract class Container<
  I extends ContainerInput = {},
  O extends ContainerOutput = ContainerOutput,
  EI extends { viewMode?: ViewMode } = {}
> extends Embeddable<I, O> {
  protected readonly embeddables: { [key: string]: Embeddable<EI, {}> } = {};

  public getViewMode() {
    return this.input.viewMode ? this.input.viewMode : ViewMode.VIEW;
  }

  public getHidePanelTitles() {
    return this.input.hidePanelTitles ? this.input.hidePanelTitles : false;
  }

  public addEmbeddable(embeddable: Embeddable<EI, {}>) {
    this.embeddables[embeddable.id] = embeddable;
    embeddable.onInputChanged(this.getInputForEmbeddable(embeddable.id));
  }

  public removeEmbeddable(embeddable: Embeddable<EI, {}>) {
    this.embeddables[embeddable.id].destroy();
    delete this.embeddables[embeddable.id];
  }

  public abstract getInputForEmbeddable(embeddableId: string): EI;

  public getEmbeddable(id: string) {
    return this.embeddables[id];
  }

  public onInputChanged(input: I) {
    this.input = input;
    Object.values(this.embeddables).forEach((embeddable: Embeddable<EI, {}>) => {
      embeddable.onInputChanged(this.getInputForEmbeddable(embeddable.id));
    });
  }
}
