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

import { EuiPage, EuiTab } from '@elastic/eui';
import React, { Component } from 'react';
import { AnyAction } from 'react-redux/node_modules/redux';
import { AnyEmbeddable } from 'ui/embeddable';
import { ActionEditor } from './action_editor';
import { ActionListing } from './action_listing';
import { EventEditor } from './event_editor';

export interface AppProps {
  embeddable?: AnyEmbeddable;
}

interface AppState {
  selectedActionId: string;
  tabId: string;
}

export class ActionEventEditorApp extends Component<AppProps, AppState> {
  private tabs: Array<{ id: string; name: string }>;
  constructor(props: AppProps) {
    super(props);

    this.state = {
      selectedActionId: '',
      tabId: 'events',
    };

    this.tabs = [
      {
        id: 'actions',
        name: 'Actions',
      },
      {
        id: 'events',
        name: 'Events',
      },
    ];
  }

  public render() {
    return (
      <div>
        {this.renderTabs()}
        <EuiPage>{this.renderTabBody()}</EuiPage>
      </div>
    );
  }

  public renderTabBody() {
    switch (this.state.tabId) {
      case 'events': {
        return <EventEditor embeddable={this.props.embeddable} onEditAction={this.onEditAction} />;
      }
      case 'actions': {
        return this.state.selectedActionId !== ''
          ? this.renderEditAction()
          : this.renderActionListing();
      }
    }
  }

  public renderTabs() {
    return this.tabs.map((tab: { id: string; name: string }, index: number) => (
      <EuiTab
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.state.tabId}
        key={index}
      >
        {tab.name}
      </EuiTab>
    ));
  }

  public onSelectedTabChanged = (id: string) => {
    this.setState({
      tabId: id,
    });
  };

  private renderActionListing() {
    return (
      <ActionListing
        onEditAction={(action: AnyAction) => this.onEditAction(action.id)}
        embeddable={this.props.embeddable}
      />
    );
  }

  private renderEditAction() {
    return (
      <ActionEditor
        clearEditor={this.clearEditor}
        actionId={this.state.selectedActionId}
        embeddable={this.props.embeddable}
      />
    );
  }

  private clearEditor = () => {
    this.setState({ selectedActionId: '' });
  };

  private onEditAction = (id: string) => {
    this.setState({ selectedActionId: id, tabId: 'actions' });
  };
}
