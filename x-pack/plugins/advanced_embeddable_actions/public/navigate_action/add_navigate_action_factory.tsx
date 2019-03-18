/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
// @ts-ignore
import { interpretAst } from 'plugins/interpreter/public/interpreter';
import React from 'react';
import ReactDOM from 'react-dom';
import {
  ActionFactory,
  ActionSavedObject,
  addAction,
  SHOW_EDIT_MODE_TRIGGER,
  Trigger,
} from 'ui/embeddable';
import { AddNavigateAction } from './add_navigate_action';

export const ADD_NAVIGATE_ACTION = 'ADD_NAVIGATE_ACTION';

export class AddNavigateActionFactory extends ActionFactory {
  constructor() {
    super({ id: ADD_NAVIGATE_ACTION, title: 'Customize flow' });
  }

  public isCompatible() {
    return Promise.resolve(true);
  }

  public allowAddingToTrigger(trigger: Trigger) {
    return trigger.id === SHOW_EDIT_MODE_TRIGGER;
  }
  public isSingleton() {
    return true;
  }
  public async renderEditor(domNode: React.ReactNode) {
    // @ts-ignore
    ReactDOM.render(<div />, domNode);
  }

  public fromSavedObject(actionSavedObject: ActionSavedObject) {
    return new AddNavigateAction(actionSavedObject);
  }

  public async createNew() {
    return addAction(new AddNavigateAction());
  }
}
