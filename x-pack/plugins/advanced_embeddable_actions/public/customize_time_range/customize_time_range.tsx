/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, ActionSavedObject } from 'ui/embeddable/actions';
import { ExecuteOptions } from 'ui/embeddable/actions/action';

import React from 'react';
import { FlyoutSession, openFlyout } from 'ui/flyout';
import { CUSTOMIZE_TIME_RANGE } from './customize_time_range_factory';
import { CustomizeTimeRangeFlyout } from './customize_time_range_flyout';

export class CustomizeTimeRangeAction extends Action {
  private flyoutSession?: FlyoutSession;

  constructor(actionSavedObject?: ActionSavedObject) {
    super({ actionSavedObject, type: CUSTOMIZE_TIME_RANGE });

    this.id = CUSTOMIZE_TIME_RANGE;
    this.title = actionSavedObject ? actionSavedObject.attributes.title : 'Customize time range';
    this.description =
      'Exposes the ability to manage and customize per embeddable "Apply Time Range" actions to content editors, via the context menu of a panel, in edit mode.';
  }

  public isCompatible() {
    return Promise.resolve(true);
  }

  public allowTemplateMapping() {
    return false;
  }

  public allowEditing() {
    return false;
  }
  public execute({ embeddable, container }: ExecuteOptions) {
    const panelId = embeddable.id;

    this.flyoutSession = openFlyout(
      <CustomizeTimeRangeFlyout
        panelId={panelId}
        embeddable={embeddable}
        container={container}
        onClose={() => {
          if (this.flyoutSession) {
            this.flyoutSession.close();
          }
        }}
      />,
      {
        'data-test-subj': 'samplePanelActionFlyout',
      }
    );
  }
}
