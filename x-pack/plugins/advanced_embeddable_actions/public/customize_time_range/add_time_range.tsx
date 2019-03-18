/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import {
  EuiButtonEmpty,
  // @ts-ignore missing typings for EuiSuperDatePicker
  EuiSuperDatePicker,
} from '@elastic/eui';
import React from 'react';
import { TimeRange } from 'ui/embeddable';

import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  onSave: (timeRange: TimeRange) => void;
}

interface State {
  timeRange: TimeRange;
}

export class AddTimeRange extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      timeRange: {
        to: 'now',
        from: 'now-15m',
      },
    };
  }

  public render() {
    return (
      <div className="dshPanel__optionsMenuForm" data-test-subj="dashboardPanelTitleInputMenuItem">
        <EuiSuperDatePicker
          start={this.state.timeRange.from}
          end={this.state.timeRange.to}
          onTimeChange={this.onTimeChange}
          showUpdateButton={false}
          isAutoRefreshOnly={false}
        />

        <EuiButtonEmpty data-test-subj="resetCustomDashboardPanelTitle" onClick={this.save}>
          <FormattedMessage
            id="kbn.dashboard.panel.optionsMenuForm.resetCustomDashboardButtonLabel"
            defaultMessage="Save"
          />
        </EuiButtonEmpty>
      </div>
    );
  }

  private onTimeChange = ({ start, end }: { start: string; end: string }) => {
    this.setState({
      timeRange: {
        from: start,
        to: end,
      },
    });
  };

  private save = () => {
    this.props.onSave(this.state.timeRange);
  };
}
