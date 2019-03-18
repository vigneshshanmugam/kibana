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

import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import React, { Component } from 'react';
import chrome from 'ui/chrome';
import { SavedObjectsClient } from 'ui/saved_objects';
import { ActionSavedObject } from '../../../../embeddable_action_editor/public/app/action_saved_object';
import { RestAction } from './rest_action';

interface RestActionEditorProps {
  actionSavedObject: ActionSavedObject;
}

interface RestActionEditorState {
  actionSavedObject: ActionSavedObject;
  urlTemplate: string;
  embeddableMapping: { [templateName: string]: string };
  containerMapping: { [templateName: string]: string };
  embeddableTemplateName: string;
  embeddableTemplatePath: string;
  containerTemplateName: string;
  containerTemplatePath: string;
}

export class RestActionEditor extends Component<RestActionEditorProps, RestActionEditorState> {
  private savedObjectsClient: SavedObjectsClient;
  private action: RestAction;

  constructor(props: RestActionEditorProps) {
    super(props);
    this.action = new RestAction(this.props.actionSavedObject);

    this.state = {
      actionSavedObject: this.props.actionSavedObject,
      urlTemplate: this.action.urlTemplate,
      embeddableMapping: this.action.embeddableMapping,
      containerMapping: this.action.containerMapping,
      embeddableTemplateName: '',
      containerTemplateName: '',
      containerTemplatePath: '',
      embeddableTemplatePath: '',
    };
    this.savedObjectsClient = chrome.getSavedObjectsClient();
  }

  public onChange = (e: any) => {
    const name = e.target.value;
    this.setState(prevState => ({
      actionSavedObject: {
        ...prevState.actionSavedObject,
        attributes: {
          ...prevState.actionSavedObject.attributes,
          configuration: name,
        },
      },
    }));
  };

  public setName = (e: any) => {
    const name = e.target.value;
    this.setState(prevState => ({
      actionSavedObject: {
        ...prevState.actionSavedObject,
        attributes: {
          ...prevState.actionSavedObject.attributes,
          title: name,
        },
      },
    }));
  };

  public saveAndClose = () => {
    this.action.embeddableMapping = this.state.embeddableMapping;
    this.action.containerMapping = this.state.containerMapping;
    this.action.urlTemplate = this.state.urlTemplate;
    this.action.displayName = this.state.actionSavedObject.attributes.title;

    this.savedObjectsClient.update(
      'ui_action',
      this.props.actionSavedObject.id,
      this.action.toSavedObject().attributes
    );
  };

  public render() {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiForm>
            <h2>Create Generic Rest Action</h2>
            <EuiSpacer size="s" />
            <EuiFormRow label="Action Name">
              <EuiFieldText
                onChange={this.setName}
                value={this.state.actionSavedObject.attributes.title}
              />
            </EuiFormRow>

            <EuiFormRow
              label="Url template"
              helpText="e.g. https://www.google.com/search?q=${QUERY}"
            >
              <EuiFieldText name="url" onChange={this.setUrl} value={this.state.urlTemplate} />
            </EuiFormRow>
            <EuiFlexGroup>
              <EuiFlexItem>
                <h2>Element template parameters</h2>
                <EuiSpacer size="s" />
                {this.renderExistingParameterRows(this.state.embeddableMapping)}
                {this.renderNewEmbeddableParameterRow()}
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            <EuiButton onClick={this.saveAndClose}>Save</EuiButton>
            <EuiSpacer size="l" />
          </EuiForm>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // private renderHelp() {
  //   return (
  //     <div>
  //       <BrowseOutputParameters />
  //     </div>
  //   );
  // }

  private renderNewParameterRow(
    name: string,
    setName: (e: any) => void,
    path: string,
    setPath: (e: any) => void,
    addMappingFn: () => void
  ) {
    return (
      <div>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Template Name">
              <EuiFieldText
                name="Template name"
                onChange={this.setEmbeddableTemplateName}
                value={this.state.embeddableTemplateName}
              />
            </EuiFormRow>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFormRow label="Path">
              <EuiFieldText
                name="Access path"
                onChange={this.setEmbeddableTemplatePath}
                value={this.state.embeddableTemplatePath}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiButtonIcon iconType="listAdd" onClick={this.addEmbeddableMapping} />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }

  private renderNewEmbeddableParameterRow() {
    return this.renderNewParameterRow(
      this.state.embeddableTemplateName,
      this.setEmbeddableTemplateName,
      this.state.embeddableTemplatePath,
      this.setEmbeddableTemplatePath,
      this.addEmbeddableMapping
    );
  }

  private renderExistingParameterRows(mapping: { [key: string]: string }) {
    return Object.keys(mapping).map(key => {
      return (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Name">
              <EuiFieldText name="Template name" value={key} disabled={true} />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Access path">
              <EuiFieldText name="Access path" value={mapping[key]} disabled={true} />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiButtonIcon iconType="trash" onClick={() => this.deleteMapping(key, mapping)} />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    });
  }

  private deleteMapping = (name: string, mapping: { [key: string]: string }) => {
    delete mapping[name];
    this.setState({ embeddableMapping: mapping });
  };

  private renderNewContainerParameterRow() {
    return this.renderNewParameterRow(
      this.state.containerTemplateName,
      this.setContainerTemplateName,
      this.state.containerTemplatePath,
      this.setContainerTemplatePath,
      this.addContainerMapping
    );
  }

  private addEmbeddableMapping = () => {
    this.setState(prevState => ({
      embeddableMapping: {
        ...prevState.embeddableMapping,
        [prevState.embeddableTemplateName]: prevState.embeddableTemplatePath,
      },
    }));
  };

  private addContainerMapping = () => {
    this.setState(prevState => ({
      embeddableMapping: {
        ...prevState.embeddableMapping,
        [prevState.containerTemplateName]: prevState.containerTemplatePath,
      },
    }));
  };

  private setUrl = e => {
    this.setState({ urlTemplate: e.target.value });
  };

  private setEmbeddableTemplatePath = e => {
    this.setState({ embeddableTemplatePath: e.target.value });
  };

  private setEmbeddableTemplateName = e => {
    this.setState({ embeddableTemplateName: e.target.value });
  };
  private setContainerTemplatePath = e => {
    this.setState({ containerTemplatePath: e.target.value });
  };

  private setContainerTemplateName = e => {
    this.setState({ containerTemplateName: e.target.value });
  };
}
