/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';

import { EuiButton, EuiFlyoutBody, EuiFlyoutHeader, EuiSpacer, EuiTitle } from '@elastic/eui';

import { ActionEditor } from 'plugins/embeddable_action_editor/app/action_editor';
import { EventEditor } from 'plugins/embeddable_action_editor/app/event_editor';
import { DashboardContainer } from 'plugins/kibana/dashboard/embeddables';
import { DashboardEmbeddable } from 'plugins/kibana/dashboard/embeddables/dashboard_container';
import {
  addAction,
  APPLY_FILTER_TRIGGER,
  saveTrigger,
  SHOW_EDIT_MODE_TRIGGER,
  SHOW_VIEW_MODE_TRIGGER,
  Trigger,
} from 'ui/embeddable';
import { DASHBOARD_DRILLDOWN_ACTION } from './dashboard_drilldown_action_factory';
import { NavigateAction } from './navigate_action';
import { NAVIGATE_ACTION_TYPE } from './navigate_action_factory';

interface Props {
  container: DashboardContainer;
  embeddable: DashboardEmbeddable;
  onClose: () => void;
  panelId: string;
}

interface State {
  id?: string;
  selectedTrigger: string;
}

export class AddNavigateActionFlyout extends Component<Props, State> {
  private trigger?: Trigger;

  constructor(props: Props) {
    super(props);
    this.state = {
      selectedTrigger: '',
    };
  }

  public async componentDidMount() {}

  public renderBody() {
    if (this.state.id) {
      return (
        <ActionEditor
          embeddable={this.props.embeddable}
          actionId={this.state.id}
          selectedTriggerId={this.state.selectedTrigger}
          clearEditor={() => this.setState({ id: undefined })}
        />
      );
    } else {
      return (
        <div>
          <EventEditor
            embeddable={this.props.embeddable}
            actionTypes={[NAVIGATE_ACTION_TYPE, DASHBOARD_DRILLDOWN_ACTION]}
            onEditAction={(id: string) => this.setState({ id })}
            hideTriggerIds={[SHOW_EDIT_MODE_TRIGGER]}
          />
          <EuiSpacer size="l" />
        </div>
      );
    }
  }

  public render() {
    return (
      <React.Fragment>
        <EuiFlyoutHeader>
          <EuiTitle size="s" data-test-subj="customizePanelTitle">
            <h1>{this.props.embeddable.getOutput().title}</h1>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{this.renderBody()}</EuiFlyoutBody>
      </React.Fragment>
    );
  }
}
