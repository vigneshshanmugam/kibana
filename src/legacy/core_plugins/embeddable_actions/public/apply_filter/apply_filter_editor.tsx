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

import { EuiButton, EuiFieldText, EuiTextArea } from '@elastic/eui';
import React, { Component } from 'react';
import chrome from 'ui/chrome';
import { SavedObjectsClient } from 'ui/saved_objects';
import { ActionSavedObject } from '../../../embeddable_action_editor/public/app/action_saved_object';

interface ExpressionActionEditorProps {
  actionSavedObject: ActionSavedObject;
}

interface ExpressionActionEditorState {
  actionSavedObject: ActionSavedObject;
}

export class ApplyFilterActionEditor extends Component<
  ExpressionActionEditorProps,
  ExpressionActionEditorState
> {
  private savedObjectsClient: SavedObjectsClient;
  constructor(props: ExpressionActionEditorProps) {
    super(props);
    this.state = {
      actionSavedObject: this.props.actionSavedObject,
    };

    this.savedObjectsClient = chrome.getSavedObjectsClient();
  }

  public render() {
    return <div />;
  }
}
