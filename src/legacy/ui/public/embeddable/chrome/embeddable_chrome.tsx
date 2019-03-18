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

import { EuiContextMenuPanelDescriptor, EuiPanel } from '@elastic/eui';
import classNames from 'classnames';
import React from 'react';
import { Action } from 'ui/embeddable/actions';
import {
  buildEuiContextMenuPanels,
  ContextMenuAction,
  ContextMenuPanel,
} from 'ui/embeddable/context_menu_actions';
import { getTrigger, SHOW_EDIT_MODE_TRIGGER } from 'ui/embeddable/triggers';
import { SHOW_VIEW_MODE_TRIGGER } from 'ui/embeddable/triggers/trigger_registry';
import { ViewMode } from 'ui/embeddable/types';
import { Container } from '../containers';
import { Embeddable } from '../embeddables';
import {
  getEditPanelAction,
  getInspectorPanelAction,
  getToggleExpandPanelAction,
} from './panel_header/panel_actions';
import { PanelHeader } from './panel_header/panel_header';

interface Props {
  embeddable: Embeddable;
  container: Container;
}

interface State {
  focusedPanelIndex?: string;
  viewMode: ViewMode;
  hidePanelTitles: boolean;
  closeContextMenu: boolean;
}

export class EmbeddableChrome extends React.Component<Props, State> {
  private embeddableRoot: React.RefObject<HTMLDivElement>;
  constructor(props: Props) {
    super(props);
    this.state = {
      viewMode: this.props.container.getViewMode(),
      hidePanelTitles: this.props.container.getHidePanelTitles(),
      closeContextMenu: false,
    };

    this.embeddableRoot = React.createRef();

    this.props.container.onOutputChanged(() => {
      this.setState({
        viewMode: this.props.container.getViewMode(),
        hidePanelTitles: this.props.container.getHidePanelTitles(),
      });
    });
  }

  public onFocus = (focusedPanelIndex: string) => {
    this.setState({ focusedPanelIndex });
  };

  public onBlur = (blurredPanelIndex: string) => {
    if (this.state.focusedPanelIndex === blurredPanelIndex) {
      this.setState({ focusedPanelIndex: undefined });
    }
  };

  public render() {
    const viewOnlyMode = this.state.viewMode === ViewMode.VIEW;
    const classes = classNames('embPanel', {
      'embPanel--editing': !viewOnlyMode,
    });
    return (
      <EuiPanel className={classes} data-test-subj="embeddablePanel" paddingSize="none">
        <PanelHeader
          getPanels={this.getPanels}
          hidePanelTitles={this.state.hidePanelTitles}
          isViewMode={viewOnlyMode}
          closeContextMenu={this.state.closeContextMenu}
          title={this.props.embeddable.getOutput().title}
        />
        <div className="embeddable-root panel-content" ref={this.embeddableRoot} />
      </EuiPanel>
    );
  }

  public componentDidMount() {
    this.props.embeddable.render(this.embeddableRoot.current);
  }

  private getPanels = async () => {
    let panels: EuiContextMenuPanelDescriptor[] = [];

    const triggerId =
      this.state.viewMode === ViewMode.EDIT ? SHOW_EDIT_MODE_TRIGGER : SHOW_VIEW_MODE_TRIGGER;

    const trigger = await getTrigger(triggerId);
    const actions = trigger.getCompatibleActions({
      embeddable: this.props.embeddable,
      container: this.props.container,
      triggerContext: {},
    });

    const contextMenuPanel = new ContextMenuPanel({
      title: 'Options',
      id: 'mainMenu',
    });

    const closeMyContextMenuPanel = () => {
      this.setState({ closeContextMenu: true }, () => {
        this.setState({ closeContextMenu: false });
      });
    };

    const wrappedForContextMenu = actions.map((action: Action) => {
      return new ContextMenuAction<Embeddable, Container>(
        {
          id: action.id,
          displayName: action.getTitle({
            embeddable: this.props.embeddable,
            container: this.props.container,
          }),
          parentPanelId: 'mainMenu',
        },
        {
          onClick: ({ embeddable, container }) => {
            action.execute({ embeddable, container });
            closeMyContextMenuPanel();
          },
        }
      );
    });

    const contextMenuActions = [
      getInspectorPanelAction({
        closeContextMenu: closeMyContextMenuPanel,
        panelTitle: this.props.embeddable.getOutput().title,
      }),
      getEditPanelAction(),
    ]
      //   .concat(panelActionsStore.actions)
      .concat(wrappedForContextMenu);

    panels = buildEuiContextMenuPanels({
      contextMenuPanel,
      actions: contextMenuActions,
      embeddable: this.props.embeddable,
      container: this.props.container,
    });
    return panels;
  };
}
