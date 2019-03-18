/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, ExecuteOptions } from 'ui/embeddable';

import React from 'react';
import { FlyoutSession, openFlyout } from 'ui/flyout';
import { CUSTOMIZE_EVENTS_ACTION } from './customize_events_factory';
import { CustomizeEventsFlyout } from './customize_events_flyout';

export class CustomizeEventsAction extends Action {
  private flyoutSession?: FlyoutSession;

  constructor() {
    super({
      type: CUSTOMIZE_EVENTS_ACTION,
    });
    this.id = CUSTOMIZE_EVENTS_ACTION;
    this.title = 'Customize events';
  }

  public isCompatible() {
    return Promise.resolve(true);
  }

  public execute({ embeddable, container }: ExecuteOptions<any, any>) {
    this.flyoutSession = openFlyout(
      <CustomizeEventsFlyout
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
