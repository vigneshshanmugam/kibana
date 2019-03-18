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
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSelect,
  EuiSpacer,
  EuiSuperSelect,
} from '@elastic/eui';
import React from 'react';
import { AnyAction } from 'react-redux/node_modules/redux';
import chrome from 'ui/chrome';
import {
  actionFactoryRegistry,
  AnyEmbeddable,
  getActions,
  getTriggers,
  saveAction,
  saveTrigger,
  SHOW_EDIT_MODE_TRIGGER,
  Trigger,
} from 'ui/embeddable';
import { CreateNewActionModal } from './create_new_action_modal';

export interface EventEditorProps {
  embeddable?: AnyEmbeddable;
  actionTypes?: string[];
  hideTriggerIds?: string[];
  onEditAction: (id: string) => void;
}

interface EventEditorState {
  triggerMapping: { [key: string]: string[] };
  selectedTrigger: string;
  showCreateModal: boolean;
}

export class EventEditor extends React.Component<EventEditorProps, EventEditorState> {
  private actions: AnyAction[] = [];
  private triggers: Trigger[] = [];

  constructor(props: EventEditorProps) {
    super(props);
    this.state = {
      triggerMapping: {},
      selectedTrigger: '',
      showCreateModal: false,
    };
  }

  public render() {
    return (
      <div>
        {this.state.showCreateModal && this.renderCreateModal()}
        <EuiFlexGroup>
          <EuiFlexItem>{this.renderTriggerSelect()}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>{this.renderCreateNewButton()}</EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <h3> Actions attached </h3>
        {this.renderExistingActions()}
        <EuiButton onClick={this.save}>Save</EuiButton>
      </div>
    );
  }

  public async componentDidMount() {
    await this.findActions();
    this.triggers = (await getTriggers()).filter(trigger => {
      return !this.props.hideTriggerIds || !this.props.hideTriggerIds.find(id => id === trigger.id);
    });
    const triggerMapping: { [key: string]: string[] } = {};
    let selectedId = '';
    this.triggers.forEach(trigger => {
      if (!triggerMapping[trigger.id]) {
        triggerMapping[trigger.id] = [];
      }

      selectedId = trigger.id;
      const actions = this.props.embeddable
        ? trigger.getCompatibleActions({ embeddable: this.props.embeddable })
        : trigger.getActions();
      actions.forEach(action => {
        triggerMapping[trigger.id].push(action.id);
      });
    });

    this.setState({ triggerMapping, selectedTrigger: selectedId });
  }

  private getActionFactoryOptions() {
    return Object.values(actionFactoryRegistry.getFactories())
      .filter(factory => {
        return (
          !factory.isSingleton() &&
          (!this.props.actionTypes || this.props.actionTypes.find(type => type === factory.id))
        );
      })
      .map((factory: ActionFactory) => ({
        value: factory.id,
        text: factory.title,
      }));
  }

  private renderCreateNewButton() {
    if (this.props.actionTypes && this.props.actionTypes.length === 1) {
      return (
        <EuiButton onClick={() => this.createAction(this.props.actionTypes[0] || '')}>
          Create new {this.props.actionTypes[0]} action
        </EuiButton>
      );
    } else {
      return (
        <EuiSelect
          options={[{ text: 'Create new action', value: '' }].concat(
            this.getActionFactoryOptions()
          )}
          value=""
          onChange={e => this.createAction(e.target.value)}
        />
      );
    }
  }

  private closeModal = () => this.setState({ showCreateModal: false });

  private onCreate = (type: string) => {
    this.createAction(type);
    this.closeModal();
  };

  private createAction = async (type: string) => {
    const factory = actionFactoryRegistry.getFactoryById(type);
    const action = await factory.createNew();
    if (action && action.id) {
      if (this.props.embeddable) {
        action.embeddableId = this.props.embeddable.id;
        action.embeddableType = this.props.embeddable.type;
      }
      action.triggerId = this.state.selectedTrigger;
      saveAction(action);
      const foundTrigger = this.triggers.find(trigger => trigger.id === this.state.selectedTrigger);
      if (foundTrigger) {
        foundTrigger.addAction(action);
        saveTrigger(foundTrigger);
      }
      this.props.onEditAction(action.id);
    }
  };

  private renderCreateModal = () => {
    return (
      <CreateNewActionModal
        onClose={this.closeModal}
        onCreate={this.onCreate}
        actionTypes={this.props.actionTypes}
      />
    );
  };

  private findActions = async () => {
    const allActions = await getActions();

    this.actions = allActions.filter(action => {
      let remove = false;
      if (this.props.embeddable) {
        if (action.embeddableId !== '') {
          remove = action.embeddableId !== this.props.embeddable.id;
        } else if (action.embeddableType !== '') {
          remove = action.embeddableType !== this.props.embeddable.type;
        } else {
          remove = false;
        }
      }
      return !remove;
    });
  };

  private save = async () => {
    Object.keys(this.state.triggerMapping).forEach(triggerId => {
      const actions = this.state.triggerMapping[triggerId];
      chrome.getSavedObjectsClient().update('ui_trigger', triggerId, {
        actions: actions.join(';'),
      });
    });

    this.triggers = await getTriggers();
  };

  private removeTriggerMapping = (actionId: string) => {
    this.setState(prevState => {
      const triggerMapping = { ...prevState.triggerMapping };
      triggerMapping[this.state.selectedTrigger] = triggerMapping[
        this.state.selectedTrigger
      ].filter(id => id !== actionId);
      return {
        triggerMapping,
      };
    });
  };

  private addTriggerMapping = (actionId: string) => {
    this.setState(prevState => {
      const triggerMapping = { ...prevState.triggerMapping };
      triggerMapping[this.state.selectedTrigger].push(actionId);
      return {
        triggerMapping,
      };
    });
  };

  private renderExistingActions() {
    if (!this.state.selectedTrigger) {
      return null;
    }
    const actions = this.state.triggerMapping[this.state.selectedTrigger];
    const items: AnyAction[] = [];
    actions.forEach((actionId: string) => {
      const foundAction = this.actions.find(action => action.id === actionId);
      if (!foundAction) {
        return;
      }
      if (this.props.actionType && foundAction.type !== this.props.actionType) {
        return;
      }
      items.push(foundAction);
    });

    const columns = [
      {
        field: 'title',
        sortable: false,
        name: 'Name',
      },
      {
        field: 'description',
        sortable: false,
        name: 'Description',
      },

      {
        field: 'id',
        sortable: false,
        name: 'Actions',
        width: '100px',
        render: (id: string) => {
          const foundAction = this.actions.find(action => action.id === id);
          return (
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiButtonIcon
                  iconType="pencil"
                  disabled={!foundAction || !foundAction.allowEditing()}
                  onClick={() => this.props.onEditAction(id)}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonIcon iconType="trash" onClick={() => this.removeTriggerMapping(id)} />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
    ];
    return <EuiBasicTable columns={columns} items={items} sorting={{}} />;
  }

  private renderAvailableActions() {
    const foundTrigger = this.triggers.find(trigger => trigger.id === this.state.selectedTrigger);
    if (!foundTrigger) {
      return null;
    }

    const columns = [
      {
        field: 'title',
        sortable: false,
        name: 'Name',
      },
      {
        field: 'description',
        sortable: false,
        name: 'Description',
      },

      {
        field: 'id',
        sortable: false,
        name: 'Attach',
        render: (id: string) => (
          <EuiButton onClick={() => this.addTriggerMapping(id)}>Attach</EuiButton>
        ),
      },
    ];
    const items = this.actions.filter(action => {
      if (this.props.actionType && action.type !== this.props.actionType) {
        return false;
      }

      const actionFactory = actionFactoryRegistry.getFactoryById(action.type);
      if (!actionFactory.allowAddingToTrigger(foundTrigger)) {
        return false;
      }

      const alreadyAttached = this.state.triggerMapping[this.state.selectedTrigger].find(
        id => id === action.id
      );
      return !alreadyAttached;
    });
    return <EuiBasicTable columns={columns} items={items} sorting={{}} />;
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

  private renderTriggerSelect() {
    return (
      <EuiFormRow label="Trigger">
        <EuiSelect
          options={this.getTriggerOptions()}
          value={this.state.selectedTrigger}
          onChange={this.changeTrigger}
        />
      </EuiFormRow>
    );
  }
}
