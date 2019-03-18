/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';

import { EuiBasicTable, EuiButton, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { DashboardContainer } from 'plugins/kibana/dashboard/embeddables';
import { DashboardEmbeddable } from 'plugins/kibana/dashboard/embeddables/dashboard_container';
import {
  actionFactoryRegistry,
  addAction,
  deleteAction,
  getTrigger,
  saveTrigger,
  SHOW_VIEW_MODE_TRIGGER,
  Trigger,
} from 'ui/embeddable';
import { TimeRange } from 'ui/visualize';
import { AddTimeRange } from './add_time_range';
import { ApplyTimeRangeAction } from './apply_time_range';
import { APPLY_TIME_RANGE, ApplyTimeRangeActionFactory } from './apply_time_range_factory';

interface CustomizeTimeRangeProps {
  container: DashboardContainer;
  embeddable: DashboardEmbeddable;
  onClose: () => void;
  panelId: string;
}

interface State {
  timeRangeActions: ApplyTimeRangeAction[];
}

export class CustomizeTimeRangeFlyout extends Component<CustomizeTimeRangeProps, State> {
  private trigger?: Trigger;
  constructor(props: CustomizeTimeRangeProps) {
    super(props);
    this.state = { timeRangeActions: [] };
  }

  public async componentDidMount() {
    this.trigger = await getTrigger(SHOW_VIEW_MODE_TRIGGER);
    const timeRangeActions = this.trigger
      .getActions()
      .filter(
        action =>
          action.type === APPLY_TIME_RANGE && action.embeddableId === this.props.embeddable.id
      ) as ApplyTimeRangeAction[];
    this.setState({
      timeRangeActions,
    });
  }

  public render() {
    return (
      <React.Fragment>
        <EuiFlyoutHeader>
          <EuiTitle size="s" data-test-subj="customizePanelTitle">
            <h1>{this.props.embeddable.getOutput().title}</h1>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <AddTimeRange onSave={this.addTimeRange} />
          {this.renderExistingActions()}
        </EuiFlyoutBody>
      </React.Fragment>
    );
  }

  private ensureDefaultTimeRangeOptionExists = async () => {
    const applyTimeRangeFactory = actionFactoryRegistry.getFactoryById(
      APPLY_TIME_RANGE
    ) as ApplyTimeRangeActionFactory;

    const defaultTimeRangeAction = new ApplyTimeRangeAction();
    defaultTimeRangeAction.id = 'DefaultContainerTimeRange';
    defaultTimeRangeAction.timeRange = undefined;
    defaultTimeRangeAction.title = 'Use time range from dashboard';
    defaultTimeRangeAction.embeddableId = this.props.embeddable.id;
    await addAction(defaultTimeRangeAction);

    if (this.trigger) {
      const newActions = _.clone(this.state.timeRangeActions);
      newActions.push(defaultTimeRangeAction);
      this.trigger.addAction(defaultTimeRangeAction);
      saveTrigger(this.trigger);
      this.setState({ timeRangeActions: newActions });
    }
  };

  private addTimeRange = async (timeRange: TimeRange) => {
    this.ensureDefaultTimeRangeOptionExists();
    const applyTimeRangeFactory = actionFactoryRegistry.getFactoryById(
      APPLY_TIME_RANGE
    ) as ApplyTimeRangeActionFactory;

    let applyTimeRangeAction = new ApplyTimeRangeAction();
    applyTimeRangeAction.timeRange = timeRange;
    applyTimeRangeAction.title = JSON.stringify(timeRange);
    applyTimeRangeAction.embeddableId = this.props.embeddable.id;
    applyTimeRangeAction = await addAction(applyTimeRangeAction);

    if (this.trigger) {
      const newActions = _.clone(this.state.timeRangeActions);
      newActions.push(applyTimeRangeAction);
      this.trigger.addAction(applyTimeRangeAction);
      saveTrigger(this.trigger);
      this.setState({ timeRangeActions: newActions });
    }
  };

  private renderExistingActions() {
    const columns = [
      {
        field: 'timeRange',
        sortable: false,
        name: 'Time range',
        render: (timeRange: TimeRange) => {
          return JSON.stringify(timeRange);
        },
      },
      {
        field: 'id',
        sortable: false,
        name: 'Remove',
        render: (id: string) => (
          <EuiButton onClick={() => this.removeTimeRange(id)}>Delete</EuiButton>
        ),
      },
    ];
    return <EuiBasicTable columns={columns} items={this.state.timeRangeActions} sorting={{}} />;
  }

  private removeTimeRange = async (id: string) => {
    if (this.trigger) {
      this.trigger.removeAction(id);

      await saveTrigger(this.trigger);
      await deleteAction(id);
    }
  };
}
