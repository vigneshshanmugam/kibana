/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
// @ts-ignore
import { interpretAst } from 'plugins/interpreter/interpreter';
import React from 'react';
import ReactDOM from 'react-dom';
import { ActionFactory, ActionSavedObject, addAction } from 'ui/embeddable';
import { ApplyTimeRangeAction } from './apply_time_range';

export const APPLY_TIME_RANGE = 'APPLY_TIME_RANGE';

export class ApplyTimeRangeActionFactory extends ActionFactory {
  constructor() {
    super({ id: APPLY_TIME_RANGE, title: 'Apply custom time range' });
  }

  public isCompatible() {
    return Promise.resolve(true);
  }

  public async renderEditor(domNode: React.ReactNode) {
    // @ts-ignore
    ReactDOM.render(<div />, domNode);
  }

  public fromSavedObject(actionSavedObject: ActionSavedObject) {
    return new ApplyTimeRangeAction(actionSavedObject);
  }

  public async createNew() {
    return addAction(new ApplyTimeRangeAction());
  }
}
