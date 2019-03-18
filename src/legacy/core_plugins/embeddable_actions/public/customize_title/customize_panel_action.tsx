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

import { Embeddable } from 'ui/embeddable';
import { Action } from 'ui/embeddable/actions';
import { ExecuteOptions } from 'ui/embeddable/actions/action';

import React from 'react';
import { Container } from 'ui/embeddable/containers';
import { openFlyout } from 'ui/flyout';
import { CustomizePanelFlyout } from './customize_panel_flyout';

interface CustomizePanelTitleActionInput {
  titleOverride?: string;
  inherit: boolean;
}

interface CustomizePanelEmbeddableState {
  customization: { title?: string };
}

interface CustomizePanelEmbeddableOutput {
  title: string;
}

type CustomizePanelEmbeddable = Embeddable<
  CustomizePanelEmbeddableState,
  CustomizePanelEmbeddableOutput
>;

interface ContainerState {
  customizations: {
    [key: string]: { title?: string };
  };
}

type CustomizePanelContainer = Container<
  ContainerState,
  ContainerState,
  CustomizePanelEmbeddableState
>;

export class CustomizePanelTitleAction extends Action<
  CustomizePanelEmbeddableState,
  CustomizePanelEmbeddable,
  CustomizePanelContainer
> {
  constructor() {
    super({
      id: 'CUSTOMIZE_PANEL_ACTION',
      title: 'Customize Panel Action',
      type: 'CUSTOMIZE_TITLE',
    });
  }

  public isCompatible({
    embeddable,
    container,
  }: {
    embeddable: CustomizePanelEmbeddable;
    container: CustomizePanelContainer;
  }) {
    return Promise.resolve(true);
  }

  public execute({
    embeddable,
    container,
  }: ExecuteOptions<CustomizePanelEmbeddable, CustomizePanelContainer>) {
    openFlyout(
      <CustomizePanelFlyout
        originalTitle={embeddable.getOutput().title}
        titleOverride={container.getInputForEmbeddable(embeddable.id).customization.title}
        onReset={() => this.onReset({ embeddable, container })}
        onUpdatePanelTitle={title => this.onSetTitle({ embeddable, container }, title)}
      />,
      {
        'data-test-subj': 'samplePanelActionFlyout',
      }
    );
  }

  private onReset(panelAPI: {
    embeddable: CustomizePanelEmbeddable;
    container: CustomizePanelContainer;
  }) {
    this.onSetTitle(panelAPI);
  }

  private onSetTitle(
    {
      embeddable,
      container,
    }: { embeddable: CustomizePanelEmbeddable; container: CustomizePanelContainer },
    title?: string
  ) {
    const currentContainerState = container.getInput();
    const embeddableCustomizations = currentContainerState.customizations[embeddable.id];
    container.onInputChanged({
      ...currentContainerState,
      customizations: {
        ...currentContainerState.customizations,
        [embeddable.id]: {
          ...embeddableCustomizations,
          title,
        },
      },
    });
  }
}
