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
import { I18nProvider } from '@kbn/i18n/react';
import React, { ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { ContainerOutput } from 'ui/embeddable/containers/container';
import { Adapters } from 'ui/inspector';
import { Container, OutputSpec, Trigger } from '..';
import { EmbeddableChrome } from '../chrome';
import { ViewMode } from '../types';

interface EmbeddableConfiguration {
  id: string;
  type: string;
}

export interface EmbeddableOutput {
  title?: string;
  editUrl?: string;
}

export abstract class Embeddable<I extends { viewMode?: ViewMode } = {}, O = EmbeddableOutput> {
  public readonly type: string;
  public readonly id: string;
  public container?: Container<{}, ContainerOutput, I>;
  protected changeListeners: Array<(<F extends O>(output: F) => void)> = [];
  protected output: O;
  protected input: I;
  private chromeContainer?: Element;

  constructor({ type, id }: EmbeddableConfiguration, initialOutput: O, initialInput: I) {
    this.type = type;
    this.id = id;
    this.output = initialOutput;
    this.input = initialInput;
  }

  public setContainer(container: Container<{}, ContainerOutput, I>) {
    this.container = container;
  }

  public onInputChanged(input: I): void {
    this.input = input;
  }

  public getOutput(): Readonly<O> {
    return this.output;
  }

  public getInput(): Readonly<I> {
    return this.input;
  }

  public getOutputSpec(trigger?: Trigger): OutputSpec {
    return {};
  }

  public onOutputChanged(listener: (output: O) => void) {
    this.changeListeners.push(listener);
  }

  public emitOutputChanged(output: O) {
    if (!_.isEqual(this.output, output)) {
      this.output = output;
      this.changeListeners.forEach(listener => listener(this.output));
    }
  }

  public supportsTrigger(trigger: Trigger) {
    return false;
  }

  /**
   * Embeddable should render itself at the given domNode.
   */
  public renderWithChrome(domNode: HTMLElement | Element) {
    // Clean up if this has already been rendered once.
    this.destroy();

    this.chromeContainer = domNode;
    if (!this.container) {
      throw new Error("Embeddable chrome can't be used without a container object");
    }

    ReactDOM.render(
      // @ts-ignore
      <I18nProvider>
        <EmbeddableChrome embeddable={this} container={this.container} />
      </I18nProvider>,
      domNode
    );
  }

  public abstract render(domNode: HTMLElement | ReactNode): void;

  /**
   * An embeddable can return inspector adapters if it want the inspector to be
   * available via the context menu of that panel.
   * @return Inspector adapters that will be used to open an inspector for.
   */
  public getInspectorAdapters(): Adapters | undefined {
    return undefined;
  }

  public destroy(): void {
    if (this.chromeContainer) {
      ReactDOM.unmountComponentAtNode(this.chromeContainer);
    }
    return;
  }

  public reload(): void {
    return;
  }
}
