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
import { openContextMenu } from 'ui/context_menu';
import { Container } from 'ui/embeddable';
import { Action } from 'ui/embeddable/actions';
import {
  buildEuiContextMenuPanels,
  ContextMenuAction,
  ContextMenuPanel,
} from 'ui/embeddable/context_menu_actions';
import { Embeddable } from 'ui/embeddable/embeddables';
import { triggerRegistry } from 'ui/embeddable/triggers/trigger_registry';
import {
  TriggerSavedObject,
  TriggerSavedObjectAttributes,
} from 'ui/embeddable/triggers/trigger_saved_object';

function isTriggerSavedObject(
  triggerSavedObject: TriggerSavedObject | { id: string; title: string }
): triggerSavedObject is TriggerSavedObject {
  return (triggerSavedObject as TriggerSavedObject).attributes !== undefined;
}
export class Trigger {
  public id: string;
  public description?: string;
  public embeddableType: string = '';
  public title: string;

  private actions: Action[] = [];

  constructor(triggerSavedObject: TriggerSavedObject | { id: string; title: string }) {
    this.id = triggerSavedObject.id;

    if (isTriggerSavedObject(triggerSavedObject)) {
      const triggerDefinition = triggerRegistry.getTrigger(this.id);
      if (!triggerDefinition) {
        throw new Error(`No registry item found for ${this.id}. Possibly a plugin was disabled.`);
      } else {
        this.title = triggerDefinition.title;
        this.description = triggerDefinition.description;
      }
    } else {
      this.title = triggerSavedObject.title;
    }
  }

  public getCompatibleActions<E extends Embeddable, C extends Container, T extends {}>({
    embeddable,
    container,
    triggerContext,
  }: {
    embeddable: E;
    container: C;
    triggerContext: T;
  }) {
    return this.actions.filter(action => {
      let remove = false;
      if (embeddable) {
        if (action.embeddableId !== '') {
          remove = action.embeddableId !== '' && action.embeddableId !== embeddable.id;
        } else if (action.embeddableType !== '') {
          remove = action.embeddableType !== '' && action.embeddableType !== embeddable.type;
        } else {
          remove = false;
        }

        if (remove) {
          return false;
        }
      }

      return action.isCompatible({ embeddable, container });
    });
  }

  public execute<E extends Embeddable, C extends Container, T extends {}>({
    embeddable,
    container,
    triggerContext,
  }: {
    embeddable: E;
    container: C;
    triggerContext: T;
  }) {
    const actions = this.getCompatibleActions({ embeddable, container, triggerContext });
    if (actions.length > 1) {
      const contextMenuPanel = new ContextMenuPanel<E, C>({
        title: 'Actions',
        id: 'mainMenu',
      });

      const closeMyContextMenuPanel = () => {
        session.close();
      };
      const wrappedForContextMenu: Array<ContextMenuAction<E, C>> = [];
      actions.forEach((action: Action) => {
        if (action.id) {
          wrappedForContextMenu.push(
            new ContextMenuAction<E, C>(
              {
                id: action.id,
                displayName: action.title,
                parentPanelId: 'mainMenu',
              },
              {
                onClick: () => {
                  action.execute({ embeddable, container, triggerContext });
                  closeMyContextMenuPanel();
                },
              }
            )
          );
        }
      });
      const panels = buildEuiContextMenuPanels<E, C>({
        contextMenuPanel,
        actions: wrappedForContextMenu,
        embeddable,
        container,
      });

      const session = openContextMenu(panels);
    } else if (actions.length === 1) {
      actions[0].execute({ embeddable, container, triggerContext });
    }
  }

  public addAction(action: Action) {
    this.actions.push(action);
  }

  public getActions() {
    return this.actions;
  }

  public containsAction(id: string) {
    return !!this.actions.find(action => action.id === id);
  }

  public removeAction(actionId: string) {
    this.actions = this.actions.filter(action => action.id !== actionId);
  }

  public getSavedObjectAttributes(): TriggerSavedObjectAttributes {
    return {
      actions: this.actions.map(action => action.id).join(';'),
    };
  }
}
