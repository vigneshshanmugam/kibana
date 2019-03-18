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
import React, { Component, Ref, RefObject } from 'react';
import { Embeddable } from 'ui/embeddable';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export interface NotebookDisplayProps {
  embeddable1: Embeddable<any, any>;
  embeddable2: Embeddable<any, any>;
}

export class NotebookDisplay extends Component<NotebookDisplayProps> {
  private embeddable1Root: RefObject<HTMLDivElement>;
  private embeddable2Root: RefObject<HTMLDivElement>;

  public constructor(props: NotebookDisplayProps) {
    super(props);

    this.embeddable1Root = React.createRef();
    this.embeddable2Root = React.createRef();
  }
  public componentDidMount() {
    if (this.embeddable1Root.current) {
      this.props.embeddable1.renderWithChrome(this.embeddable1Root.current);
    }
    if (this.embeddable2Root.current) {
      this.props.embeddable2.renderWithChrome(this.embeddable2Root.current);
    }
  }

  public componentWillUnmount() {
    this.props.embeddable1.destroy();
    this.props.embeddable2.destroy();
  }

  public render() {
    return (
      <div>
        <p>
          Welcome to my pretend notebook app. All it does is display two embeddables, but they share
          a container so if state changes in the container, like a time range, both embeddables will
          update accordingly.
        </p>
        <EuiFlexGroup>
          <EuiFlexItem>
            <div style={{ height: '400px' }} ref={this.embeddable1Root} />
          </EuiFlexItem>
          <EuiFlexItem>
            This is plain text. I can display these embeddables however I like
          </EuiFlexItem>
          <EuiFlexItem>
            <div style={{ height: '400px' }} ref={this.embeddable2Root} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
}
