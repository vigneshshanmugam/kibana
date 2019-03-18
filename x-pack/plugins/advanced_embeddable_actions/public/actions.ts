/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  addAction,
  getAction,
  getTrigger,
  saveTrigger,
  SHOW_EDIT_MODE_TRIGGER,
} from 'ui/embeddable';
import { actionFactoryRegistry } from 'ui/embeddable/actions/action_factory_registry';

import { CustomizeEventsAction, CustomizeEventsFactory } from './customize_events';

import {
  ApplyTimeRangeActionFactory,
  CustomizeTimeRangeAction,
  CustomizeTimeRangeFactory,
} from './customize_time_range';
import { ExpressionActionFactory } from './expression_action/expression_action_factory';
import { AddNavigateAction } from './navigate_action/add_navigate_action';
import { AddNavigateActionFactory } from './navigate_action/add_navigate_action_factory';
import { DashboardDrilldownActionFactory } from './navigate_action/dashboard_drilldown_action_factory';
import { NavigateActionFactory } from './navigate_action/navigate_action_factory';

import { CUSTOMIZE_TIME_RANGE } from './customize_time_range/customize_time_range_factory';
import { ADD_NAVIGATE_ACTION } from './navigate_action/add_navigate_action_factory';

addAction(new CustomizeTimeRangeAction());
addAction(new AddNavigateAction());

actionFactoryRegistry.registerActionFactory(new CustomizeEventsFactory());
actionFactoryRegistry.registerActionFactory(new ExpressionActionFactory());
actionFactoryRegistry.registerActionFactory(new NavigateActionFactory());
actionFactoryRegistry.registerActionFactory(new CustomizeTimeRangeFactory());
actionFactoryRegistry.registerActionFactory(new ApplyTimeRangeActionFactory());
actionFactoryRegistry.registerActionFactory(new AddNavigateActionFactory());
actionFactoryRegistry.registerActionFactory(new DashboardDrilldownActionFactory());

async function seedGlobalTriggers() {
  try {
    const trigger = await getTrigger(SHOW_EDIT_MODE_TRIGGER);
    const addNavigateAction = await getAction(ADD_NAVIGATE_ACTION);

    if (addNavigateAction && !trigger.containsAction(ADD_NAVIGATE_ACTION)) {
      trigger.addAction(addNavigateAction);
    }

    const customizeTimeRangeAction = await getAction(CUSTOMIZE_TIME_RANGE);
    if (customizeTimeRangeAction && !trigger.containsAction(CUSTOMIZE_TIME_RANGE)) {
      trigger.addAction(customizeTimeRangeAction);
    }
    await saveTrigger(trigger);
  } catch (e) {
    return;
  }
}

seedGlobalTriggers();
