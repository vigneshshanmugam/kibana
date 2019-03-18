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
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import {
  Action,
  actionFactoryRegistry,
  deleteAction,
  Embeddable,
  embeddableFactories,
  getAction,
  getTriggers,
  saveAction,
  Trigger,
} from 'ui/embeddable';
import { ConfigureTemplateParameters } from './configure_template_parameters';

export interface ActionEditorProps {
  clearEditor: () => void;
  actionId: string;
  embeddable?: Embeddable;
  selectedTriggerId?: string;
}
interface ActionEditorState {
  action?: Action;
  config: string;
  selectedTrigger: string;
  triggerIds: string[];
  factoryType: string;
}

export class ActionEditor extends React.Component<ActionEditorProps, ActionEditorState> {
  private editorRoot?: React.RefObject<HTMLDivElement>;
  private triggers?: Trigger[];
  private setEditorRoot: (element: React.RefObject<HTMLDivElement>) => void;

  constructor(props: ActionEditorProps) {
    super(props);
    this.state = {
      config: '',
      selectedTrigger: this.props.selectedTriggerId || '',
      triggerIds: [],
      factoryType: this.props.embeddable
        ? this.props.embeddable.type
        : Object.values(embeddableFactories.getFactories())[0].name,
    };

    this.setEditorRoot = (element: React.RefObject<HTMLDivElement>) => {
      this.editorRoot = element;

      if (this.state.action && this.editorRoot) {
        const factory = actionFactoryRegistry.getFactoryById(this.state.action.type);
        factory.renderEditor(this.editorRoot, this.state.config, this.onChange);
      }
    };
  }

  public async componentDidMount() {
    const action = await getAction(this.props.actionId);
    this.triggers = (await getTriggers()).filter(trigger => {
      return !this.props.selectedTriggerId || trigger.id === this.props.selectedTriggerId;
    });
    if (action && action.triggerId) {
      this.setState({ selectedTrigger: action.triggerId });
    }
    this.setState({
      triggerIds: this.triggers.map(trigger => trigger.id),
    });
    if (action) {
      this.setState({ action, config: action.getSavedObjectAttributes().configuration });
    }
  }

  public saveAndClose = async () => {
    if (this.state.action) {
      this.state.action.updateConfiguration(this.state.config);
      await saveAction(this.state.action);
      this.cancel();
    }
  };
  public deleteAndClose = async () => {
    if (this.state.action && this.state.action.id) {
      await deleteAction(this.state.action.id);
    }
    this.cancel();
  };

  public setName = (e: any) => {
    const name = e.target.value;
    this.setState(prevState => {
      const action = prevState.action;
      if (action) {
        action.title = name;
      }
      return {
        action,
      };
    });
  };

  public renderElementTypeSelect() {
    if (this.props.embeddable) {
      return (
        <EuiFormRow label="Element Type">
          <EuiSelect
            value={this.props.embeddable.type}
            options={this.getFactoryTypeOptions()}
            onChange={this.selectFactory}
            disabled={true}
          />
        </EuiFormRow>
      );
    }
    return (
      <EuiFormRow label="Element Type">
        <EuiSelect options={this.getFactoryTypeOptions()} onChange={this.selectFactory} />
      </EuiFormRow>
    );
  }

  public render() {
    if (!this.state.action) {
      return null;
    }

    const trigger = this.triggers
      ? this.triggers.find(t => this.state.selectedTrigger === t.id)
      : undefined;

    const factory = actionFactoryRegistry.getFactoryById(this.state.action.type);
    const actionFactoryTitle = factory.title;
    return (
      <EuiForm>
        <h3>Create new {actionFactoryTitle}</h3>
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Name">
              <EuiFieldText onChange={this.setName} value={this.state.action.title} />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>{this.renderTriggerSelect()}</EuiFlexItem>
          <EuiFlexItem>{this.renderElementTypeSelect()}</EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup>
          <EuiFlexItem>
            <div ref={this.setEditorRoot} />
          </EuiFlexItem>
        </EuiFlexGroup>

        {factory.showParameterization() && (
          <ConfigureTemplateParameters
            onMappingChange={this.onMappingChange}
            embeddable={this.props.embeddable}
            trigger={trigger}
            factoryName={this.state.factoryType}
            embeddableTemplateMapping={this.state.action.embeddableTemplateMapping}
          />
        )}
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton color="danger" onClick={this.deleteAndClose}>
              Delete
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={this.saveAndClose}>Save</EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={this.cancel}>Close</EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    );
  }

  private selectFactory = (e: any) => {
    this.setState({ factoryType: e.target.value });
  };

  private getFactoryTypeOptions() {
    if (this.props.embeddable) {
      return [
        {
          value: this.props.embeddable.type,
          text: this.props.embeddable.type,
        },
      ];
    }

    return Object.values(embeddableFactories.getFactories()).map(factory => ({
      value: factory.name,
      text: factory.name,
    }));
  }

  private onMappingChange = (newMapping: { [key: string]: string }) => {
    this.setState(prevState => {
      const action = prevState.action;
      if (action) {
        action.embeddableTemplateMapping = newMapping;
        return { action };
      }
    });
  };

  private onChange = (config: string) => {
    this.setState(
      {
        config,
      },
      () => {
        if (this.state.action) {
          const factory = actionFactoryRegistry.getFactoryById(this.state.action.type);
          factory.renderEditor(this.editorRoot, this.state.config, this.onChange);
        }
      }
    );
  };

  private cancel = () => {
    this.props.clearEditor();
  };

  private getTriggerOptions() {
    if (!this.triggers) {
      return {};
    }

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

  private renderTriggerSelect() {
    if (!this.state.action) {
      return null;
    }
    if (!this.state.action.allowTemplateMapping()) {
      return null;
    }
    const selectedTrigger = this.state.action.triggerId || this.state.selectedTrigger;
    return (
      <EuiFormRow label="Trigger">
        <EuiSelect
          options={this.getTriggerOptions()}
          value={selectedTrigger}
          onChange={this.changeTrigger}
          disabled={this.state.action.triggerId !== ''}
        />
      </EuiFormRow>
    );
  }
}
