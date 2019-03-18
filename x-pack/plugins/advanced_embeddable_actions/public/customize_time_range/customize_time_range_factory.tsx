/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
// @ts-ignore
import { interpretAst } from 'plugins/interpreter/interpreter';
import {
  DashboardContainer,
  DashboardEmbeddable,
} from 'plugins/kibana/dashboard/embeddables/dashboard_container';
import React from 'react';
import ReactDOM from 'react-dom';
import { AnyAction } from 'react-redux/node_modules/redux';
import {
  ActionFactory,
  ActionSavedObject,
  addAction,
  SHOW_EDIT_MODE_TRIGGER,
  Trigger,
} from 'ui/embeddable';
import { CustomizeTimeRangeAction } from './customize_time_range';

export const CUSTOMIZE_TIME_RANGE = 'CUSTOMIZE_TIME_RANGE';

export class CustomizeTimeRangeFactory extends ActionFactory {
  constructor() {
    super({ id: CUSTOMIZE_TIME_RANGE, title: 'Customize time range' });
  }

  public isCompatible({
    embeddable,
    container,
  }: {
    embeddable: DashboardEmbeddable;
    container: DashboardContainer;
  }) {
    return Promise.resolve(true);
  }

  public isSingleton() {
    return true;
  }

  public allowAddingToTrigger(trigger: Trigger) {
    return trigger.id === SHOW_EDIT_MODE_TRIGGER;
  }

  public async renderEditor(domNode: React.ReactNode) {
    // @ts-ignore
    ReactDOM.render(<div />, domNode);
  }

  public fromSavedObject(actionSavedObject: ActionSavedObject) {
    return new CustomizeTimeRangeAction(actionSavedObject);
  }

  public async createNew() {
    return addAction(new CustomizeTimeRangeAction());
  }
}
