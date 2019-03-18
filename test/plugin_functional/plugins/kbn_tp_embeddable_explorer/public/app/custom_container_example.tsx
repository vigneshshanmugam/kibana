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
  VisualizeInput,
  VisualizeOutput,
} from 'plugins/kibana/visualize/embeddable/visualize_embeddable';
import { VISUALIZE_EMBEDDABLE_TYPE } from 'plugins/kibana/visualize/embeddable/visualize_embeddable_factory';
import React, { ReactNode } from 'react';
import { EmbeddableFactory } from 'ui/embeddable';
import { CustomContainer } from '../embeddables/custom_container';

export interface CustomContainerExampleProps {
  getEmbeddableFactory: <I, O>(type: string) => EmbeddableFactory<I, O> | undefined;
}

export class CustomContainerExample extends React.Component<CustomContainerExampleProps> {
  private dashboardEmbeddableRoot: React.RefObject<HTMLDivElement>;
  private customContainer: CustomContainer;

  public constructor(props: CustomContainerExampleProps) {
    super(props);

    this.dashboardEmbeddableRoot = React.createRef();
    this.customContainer = new CustomContainer();
  }

  public async componentDidMount() {
    const visualizeFactory = this.props.getEmbeddableFactory<VisualizeInput, VisualizeOutput>(
      VISUALIZE_EMBEDDABLE_TYPE
    );
    if (visualizeFactory) {
      const embeddableConfigs = [
        {
          savedObjectId: '37cc8650-b882-11e8-a6d9-e546fe2bba5f',
          id: '3',
        },
        {
          id: '2',
          savedObjectId: 'ed8436b0-b88b-11e8-a6d9-e546fe2bba5f',
        },
      ];
      const embeddable1 = await visualizeFactory.create(embeddableConfigs[0], {
        embeddableCustomization: {},
      });
      const embeddable2 = await visualizeFactory.create(embeddableConfigs[1], {
        embeddableCustomization: {},
      });
      this.customContainer.setEmbeddables(embeddable1, embeddable2);
      this.customContainer.render(this.dashboardEmbeddableRoot.current);
    }
  }

  public componentWillUnmount() {
    if (this.customContainer) {
      this.customContainer.destroy();
    }
  }
  public render() {
    return (
      <div className="app-container dshAppContainer">
        <h1>Custom Embeddable Container:</h1>
        <p>
          This is a custom container object, to show that visualize embeddables can be rendered
          outside of the dashboard container.
        </p>
        <div ref={this.dashboardEmbeddableRoot} />
      </div>
    );
  }
}
