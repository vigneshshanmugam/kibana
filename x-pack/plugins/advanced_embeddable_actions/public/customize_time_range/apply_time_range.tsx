/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, ActionSavedObject } from 'ui/embeddable/actions';
import { ExecuteOptions } from 'ui/embeddable/actions/action';

import { TimeRange } from 'ui/embeddable';
import { APPLY_TIME_RANGE } from './apply_time_range_factory';

export class ApplyTimeRangeAction extends Action {
  public timeRange?: TimeRange;

  constructor(actionSavedObject?: ActionSavedObject) {
    super({ actionSavedObject, type: APPLY_TIME_RANGE });
    if (
      actionSavedObject &&
      actionSavedObject.attributes.configuration &&
      actionSavedObject.attributes.configuration !== ''
    ) {
      this.timeRange = JSON.parse(actionSavedObject.attributes.configuration);
    }
  }

  public getConfiguration() {
    return JSON.stringify(this.timeRange);
  }

  public isCompatible() {
    return Promise.resolve(true);
  }

  public allowTemplateMapping() {
    return false;
  }

  public execute({ embeddable, container }: ExecuteOptions<any, any>) {
    const panelId = embeddable.id;
    const newContainerInputState = _.cloneDeep(container.getOutput());
    if (this.timeRange) {
      newContainerInputState.panels[panelId].embeddableConfig.timeRange = this.timeRange;
    } else {
      newContainerInputState.panels[panelId].embeddableConfig.timeRange = undefined;
    }
    container.onInputChanged(newContainerInputState);
  }
}
