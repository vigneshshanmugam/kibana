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
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import React from 'react';
import { getTriggers } from 'ui/embeddable';

interface Props {
  triggerId: string;
  disabled: boolean;
  onChange: (id: string) => void;
  hideIds?: string[];
}

interface State {
  ids: string[];
}

export class TriggerSelect extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { ids: [] };
  }
  public async componentDidMount() {
    const triggers = (await getTriggers()).filter(trigger => {
      return !this.props.hideIds || !this.props.hideIds.find(id => id === trigger.id);
    });
  }

  public render() {
    return (
      <EuiFormRow label="Trigger">
        <EuiSelect
          options={this.getTriggerOptions()}
          value={this.props.triggerId}
          onChange={this.changeTrigger}
          disabled={this.props.disabled}
        />
      </EuiFormRow>
    );
  }
  private getTriggerOptions() {
    return this.triggers.map(trigger => {
      return {
        value: trigger.id,
        text: trigger.title,
      };
    });
  }

  private changeTrigger = (evt: any) => {
    this.setState({ selectedTrigger: evt.target.value });
  };
}
