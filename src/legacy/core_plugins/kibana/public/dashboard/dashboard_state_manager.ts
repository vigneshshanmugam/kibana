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

import { i18n } from '@kbn/i18n';
import _ from 'lodash';

import {
  DashboardContainerOutput,
  DashboardEmbeddableOutput,
} from 'src/legacy/core_plugins/dashboard_embeddable/public/embeddable/dashboard_container';
import { PanelState } from 'src/legacy/core_plugins/dashboard_embeddable/public/embeddable/types';
import { Query, ViewMode } from 'ui/embeddable';
import { AppState } from 'ui/state_management/app_state';
import { stateMonitorFactory } from 'ui/state_management/state_monitor_factory';
import { Timefilter } from 'ui/timefilter';
import { TimeRange } from 'ui/visualize';
import { Filter } from 'ui/visualize/loader/types';
import { getAppStateDefaults, migrateAppState } from './lib';
import { FilterUtils } from './lib/filter_utils';
import { createPanelState } from './panel';
import { PanelUtils } from './panel/panel_utils';
import { SavedObjectDashboard } from './saved_dashboard/saved_dashboard';

export type AddFilterFuntion = (
  {
    field,
    value,
    operator,
    index,
  }: { field: string; value: string; operator: string; index: string }
) => void;

/**
 * Dashboard state manager handles connecting angular and redux state between the angular and react portions of the
 * app. There are two "sources of truth" that need to stay in sync - AppState (aka the `_a` portion of the url) and
 * the Store. They aren't complete duplicates of each other as AppState has state that the Store doesn't, and vice
 * versa. They should be as decoupled as possible so updating the store won't affect bwc of urls.
 */
export class DashboardStateManager {
  public savedDashboard: SavedObjectDashboard;
  private appState: AppState;
  private stateDefaults: any;
  private addFilter: AddFilterFuntion;
  private hideWriteControls: boolean;
  private isDirty: boolean;
  private lastSavedDashboardFilters: any;
  private panelIndexPatternMapping: object;
  private changeListeners: any[];
  private unsubscribe: any;
  private stateMonitor: any;

  /**
   *
   * @param {SavedDashboard} savedDashboard
   * @param {AppState} AppState The AppState class to use when instantiating a new AppState instance.
   * @param {boolean} hideWriteControls true if write controls should be hidden.
   * @param {function} addFilter a function that can be used to add a filter bar filter
   */
  constructor({
    savedDashboard,
    AppStateClass,
    hideWriteControls,
    addFilter,
  }: {
    savedDashboard: SavedObjectDashboard;
    AppStateClass: any;
    hideWriteControls: boolean;
    addFilter: AddFilterFuntion;
  }) {
    this.savedDashboard = savedDashboard;
    this.hideWriteControls = hideWriteControls;
    this.addFilter = addFilter;

    this.stateDefaults = getAppStateDefaults(this.savedDashboard, this.hideWriteControls);

    this.appState = new AppStateClass(this.stateDefaults);

    // Initializing appState does two things - first it translates the defaults into AppState, second it updates
    // appState based on the URL (the url trumps the defaults). This means if we update the state format at all and
    // want to handle BWC, we must not only migrate the data stored with saved Dashboard, but also any old state in the
    // url.
    migrateAppState(this.appState);

    this.isDirty = false;

    // We can't compare the filters stored on this.appState to this.savedDashboard because in order to apply
    // the filters to the visualizations, we need to save it on the dashboard. We keep track of the original
    // filter state in order to let the user know if their filters changed and provide this specific information
    // in the 'lose changes' warning message.
    this.lastSavedDashboardFilters = this.getFilterState();

    // A mapping of panel index to the index pattern it uses.
    this.panelIndexPatternMapping = {};

    PanelUtils.initPanelIndexes(this.getPanels());

    this.createStateMonitor();

    //    store.dispatch(closeContextMenu());

    // Always start out with all panels minimized when a dashboard is first loaded.
    //   store.dispatch(minimizePanel());
    // this._pushAppStateChangesToStore();

    this.changeListeners = [];

    this.stateMonitor.onChange((status: { isDirty: boolean }) => {
      this.changeListeners.forEach(listener => listener(status));
      //  this._pushAppStateChangesToStore();
    });
  }

  public registerChangeListener(callback: (status: { dirty: boolean }) => void) {
    this.changeListeners.push(callback);
  }

  public equalsAppStatePanels(panels: { [key: string]: PanelState }) {
    const appStatePanels = this.getPanels();

    if (Object.values(panels).length !== appStatePanels.length) {
      return false;
    }

    return appStatePanels.every((appStatePanel: PanelState) => {
      const panel = panels[appStatePanel.panelIndex];
      return _.isEqual(appStatePanel, panel);
    });
  }

  /**
   * Time is part of global state so we need to deal with it outside of _pushAppStateChangesToStore.
   * @param {String|Object} newTimeFilter.to -- either a string representing an absolute time in utc format,
   * or a relative time (now-15m), or a moment object
   * @param {String|Object} newTimeFilter.from - either a string representing an absolute or a relative time, or a
   * moment object
   */
  // public handleTimeChange() {
  //   // store.dispatch(updateTimeRange({
  //   //   from: FilterUtils.convertTimeToUTCString(newTimeFilter.from),
  //   //   to: FilterUtils.convertTimeToUTCString(newTimeFilter.to),
  //   // }));
  // }

  public _pushFiltersToStore() {
    // const state = store.getState();
    // const dashboardFilters = this.getDashboardFilterBars();
    // if (
    //   !_.isEqual(
    //     FilterUtils.cleanFiltersForComparison(dashboardFilters),
    //     FilterUtils.cleanFiltersForComparison(getFilters(state))
    //   )
    // ) {
    //   store.dispatch(updateFilters(dashboardFilters));
    // }
  }

  public handleDashboardEmbeddableChanges(dashboardOutput: DashboardContainerOutput) {
    let dirty = false;

    if (!this.equalsAppStatePanels(dashboardOutput.panels)) {
      const panels = dashboardOutput.panels;
      this.appState.panels = [];
      this.panelIndexPatternMapping = {};
      Object.values(panels).map(panel => {
        this.appState.panels.push(_.cloneDeep(panel));
      });
      dirty = true;
    }

    // _.forEach(getEmbeddables(store.getState()), (embeddable, panelId) => {
    //   if (embeddable.initialized && !this.panelIndexPatternMapping.hasOwnProperty(panelId)) {
    //     const embeddableMetadata = getEmbeddableMetadata(store.getState(), panelId);
    //     if (embeddableMetadata.indexPatterns) {
    //       this.panelIndexPatternMapping[panelId] = _.compact(embeddableMetadata.indexPatterns);
    //       this.dirty = true;
    //     }
    //   }
    // });

    // const stagedFilters = getStagedFilters(store.getState());
    // stagedFilters.forEach(filter => {
    //   this.addFilter(filter);
    // });
    // if (stagedFilters.length > 0) {
    //   this.saveState();
    //   store.dispatch(clearStagedFilters());
    // }

    if (dashboardOutput.isFullScreenMode !== this.getFullScreenMode()) {
      this.setFullScreenMode(dashboardOutput.isFullScreenMode);
    }

    if (!_.isEqual(dashboardOutput.query, this.getQuery())) {
      this.setQuery(dashboardOutput.query);
    }

    this.changeListeners.forEach(listener => listener({ dirty }));
    this.saveState();
  }

  public getFullScreenMode() {
    return this.appState.fullScreenMode;
  }

  public setFullScreenMode(fullScreenMode: boolean) {
    this.appState.fullScreenMode = fullScreenMode;
    this.saveState();
  }

  public getPanelIndexPatterns() {
    const indexPatterns = _.flatten(Object.values(this.panelIndexPatternMapping));
    return _.uniq(indexPatterns, 'id');
  }

  /**
   * Resets the state back to the last saved version of the dashboard.
   */
  public resetState() {
    // In order to show the correct warning for the saved-object-save-as-check-box we have to store the unsaved
    // title on the dashboard object. We should fix this at some point, but this is how all the other object
    // save panels work at the moment.
    this.savedDashboard.title = this.savedDashboard.lastSavedTitle;

    // appState.reset uses the internal defaults to reset the state, but some of the default settings (e.g. the panels
    // array) point to the same object that is stored on appState and is getting modified.
    // The right way to fix this might be to ensure the defaults object stored on state is a deep
    // clone, but given how much code uses the state object, I determined that to be too risky of a change for
    // now.  TODO: revisit this!
    this.stateDefaults = getAppStateDefaults(this.savedDashboard, this.hideWriteControls);
    // The original query won't be restored by the above because the query on this.savedDashboard is applied
    // in place in order for it to affect the visualizations.
    this.stateDefaults.query = this.lastSavedDashboardFilters.query;
    // Need to make a copy to ensure they are not overwritten.
    this.stateDefaults.filters = [...this.getLastSavedFilterBars()];

    this.isDirty = false;
    this.appState.setDefaults(this.stateDefaults);
    this.appState.reset();
    this.stateMonitor.setInitialState(this.appState.toJSON());
  }

  /**
   * Returns an object which contains the current filter state of this.savedDashboard.
   * @returns {{timeTo: String, timeFrom: String, filterBars: Array, query: Object}}
   */
  public getFilterState() {
    return {
      timeTo: this.savedDashboard.timeTo,
      timeFrom: this.savedDashboard.timeFrom,
      filterBars: this.getDashboardFilterBars(),
      query: this.getDashboardQuery(),
    };
  }

  public getTitle() {
    return this.appState.title;
  }

  public getDescription() {
    return this.appState.description;
  }

  public setDescription(description: string) {
    this.appState.description = description;
    this.saveState();
  }

  public setTitle(title: string) {
    this.appState.title = title;
    // The saved-object-save-as-check-box shows a warning if the current object title is different then
    // the existing object title. It calculates this difference by comparing this.dashboard.title to
    // this.dashboard.lastSavedTitle, so we need to push the temporary, unsaved title, onto the dashboard.
    this.savedDashboard.title = title;
    this.saveState();
  }

  public getAppState() {
    return this.appState;
  }

  public getQuery() {
    return this.appState.query;
  }

  public getUseMargins() {
    // Existing dashboards that don't define this should default to false.
    return this.appState.options.useMargins === undefined
      ? false
      : this.appState.options.useMargins;
  }

  public setUseMargins(useMargins: boolean) {
    this.appState.options.useMargins = useMargins;
    this.saveState();
  }

  public getHidePanelTitles() {
    return this.appState.options.hidePanelTitles;
  }

  public setHidePanelTitles(hidePanelTitles: boolean) {
    this.appState.options.hidePanelTitles = hidePanelTitles;
    this.saveState();
  }

  public getTimeRestore() {
    return this.appState.timeRestore;
  }

  public setTimeRestore(timeRestore: boolean) {
    this.appState.timeRestore = timeRestore;
    this.saveState();
  }

  /**
   * @returns {boolean}
   */
  public getIsTimeSavedWithDashboard() {
    return this.savedDashboard.timeRestore;
  }

  public getDashboardFilterBars() {
    return FilterUtils.getFilterBarsForDashboard(this.savedDashboard);
  }

  public getDashboardQuery() {
    return FilterUtils.getQueryFilterForDashboard(this.savedDashboard);
  }

  public getLastSavedFilterBars() {
    return this.lastSavedDashboardFilters.filterBars;
  }

  public getLastSavedQuery() {
    return this.lastSavedDashboardFilters.query;
  }

  /**
   * @returns {boolean} True if the query changed since the last time the dashboard was saved, or if it's a
   * new dashboard, if the query differs from the default.
   */
  public getQueryChanged() {
    const currentQuery = this.appState.query;
    const lastSavedQuery = this.getLastSavedQuery();

    const isLegacyStringQuery =
      _.isString(lastSavedQuery) && _.isPlainObject(currentQuery) && _.has(currentQuery, 'query');
    if (isLegacyStringQuery) {
      return lastSavedQuery !== currentQuery.query;
    }

    return !_.isEqual(currentQuery, lastSavedQuery);
  }

  /**
   * @returns {boolean} True if the filter bar state has changed since the last time the dashboard was saved,
   * or if it's a new dashboard, if the query differs from the default.
   */
  public getFilterBarChanged() {
    return !_.isEqual(
      FilterUtils.cleanFiltersForComparison(this.appState.filters),
      FilterUtils.cleanFiltersForComparison(this.getLastSavedFilterBars())
    );
  }

  /**
   * @param timeFilter
   * @returns {boolean} True if the time state has changed since the time saved with the dashboard.
   */
  public getTimeChanged(timeFilter: Timefilter) {
    return (
      !FilterUtils.areTimesEqual(
        this.lastSavedDashboardFilters.timeFrom,
        timeFilter.getTime().from
      ) ||
      !FilterUtils.areTimesEqual(this.lastSavedDashboardFilters.timeTo, timeFilter.getTime().to)
    );
  }

  /**
   *
   * @returns {ViewMode}
   */
  public getViewMode() {
    return this.hideWriteControls ? ViewMode.VIEW : this.appState.viewMode;
  }

  /**
   * @returns {boolean}
   */
  public getIsViewMode() {
    return this.getViewMode() === ViewMode.VIEW;
  }

  /**
   * @returns {boolean}
   */
  public getIsEditMode() {
    return this.getViewMode() === ViewMode.EDIT;
  }

  /**
   *
   * @returns {boolean} True if the dashboard has changed since the last save (or, is new).
   */
  public getIsDirty(timeFilter?: TimeRange) {
    // Filter bar comparison is done manually (see cleanFiltersForComparison for the reason) and time picker
    // changes are not tracked by the state monitor.
    const hasTimeFilterChanged = timeFilter ? this.getFiltersChanged(timeFilter) : false;
    return this.getIsEditMode() && (this.isDirty || hasTimeFilterChanged);
  }

  public getPanels() {
    return this.appState.panels;
  }

  public updatePanel(panelIndex: string, panelAttributes: any) {
    const foundPanel = this.getPanels().find(
      (panel: PanelState) => panel.panelIndex === panelIndex
    );
    Object.assign(foundPanel, panelAttributes);
    this.saveState();
    return foundPanel;
  }

  /**
   * Creates and initializes a basic panel, adding it to the state.
   * @param {number} id
   * @param {string} type
   */
  public addNewPanel = (id: string, type: string) => {
    const maxPanelIndex = PanelUtils.getMaxPanelIndex(this.getPanels());
    const newPanel = createPanelState(id, type, maxPanelIndex, this.getPanels());
    this.getPanels().push(newPanel);
    this.saveState();
  };

  public removePanel(panelIndex: string) {
    _.remove(this.getPanels(), (panel: PanelState) => {
      if (panel.panelIndex === panelIndex) {
        // delete this.panelIndexPatternMapping[panelIndex];
        return true;
      } else {
        return false;
      }
    });
    this.saveState();
  }

  /**
   * @param timeFilter
   * @returns {Array.<string>} An array of user friendly strings indicating the filter types that have changed.
   */
  public getChangedFilterTypes(timeFilter: TimeRange) {
    const changedFilters = [];
    if (this.getFilterBarChanged()) {
      changedFilters.push('filter');
    }
    if (this.getQueryChanged()) {
      changedFilters.push('query');
    }
    if (this.savedDashboard.timeRestore && this.getTimeChanged(timeFilter)) {
      changedFilters.push('time range');
    }
    return changedFilters;
  }

  /**
   * @return {boolean} True if filters (query, filter bar filters, and time picker if time is stored
   * with the dashboard) have changed since the last saved state (or if the dashboard hasn't been saved,
   * the default state).
   */
  public getFiltersChanged(timeFilter: Timefilter) {
    return this.getChangedFilterTypes(timeFilter).length > 0;
  }

  /**
   * Updates timeFilter to match the time saved with the dashboard.
   * @param {Object} timeFilter
   * @param {func} timeFilter.setTime
   * @param {func} timeFilter.setRefreshInterval
   */
  public syncTimefilterWithDashboard(timeFilter: Timefilter) {
    if (!this.getIsTimeSavedWithDashboard()) {
      throw new Error(
        i18n.translate('kbn.dashboard.stateManager.timeNotSavedWithDashboardErrorMessage', {
          defaultMessage: 'The time is not saved with this dashboard so should not be synced.',
        })
      );
    }

    timeFilter.setTime({
      from: this.savedDashboard.timeFrom,
      to: this.savedDashboard.timeTo,
    });

    if (this.savedDashboard.refreshInterval) {
      timeFilter.setRefreshInterval(this.savedDashboard.refreshInterval);
    }
  }

  /**
   * Saves the current application state to the URL.
   */
  public saveState() {
    this.appState.save();
  }

  public setQuery(query: { query: string; language: string }) {
    this.appState.query = query;
    this.saveState();
  }

  /**
   * Applies the current filter state to the dashboard.
   * @param filter {Array.<Object>} An array of filter bar filters.
   */
  public applyFilters(query: Query, filters: Filter[]) {
    this.appState.query = query;
    this.savedDashboard.searchSource.setField('query', query);
    this.savedDashboard.searchSource.setField('filter', filters);
    this.saveState();
    // pinned filters go on global state, therefore are not propagated to store via app state and have to be pushed manually.
    this._pushFiltersToStore();
  }

  /**
   * Creates a state monitor and saves it to this.stateMonitor. Used to track unsaved changes made to appState.
   */
  public createStateMonitor() {
    this.stateMonitor = stateMonitorFactory.create(this.appState, this.stateDefaults);

    this.stateMonitor.ignoreProps('viewMode');
    // Filters need to be compared manually because they sometimes have a $$hashkey stored on the object.
    this.stateMonitor.ignoreProps('filters');
    // Query needs to be compared manually because saved legacy queries get migrated in app state automatically
    this.stateMonitor.ignoreProps('query');

    this.stateMonitor.onChange((status: { dirty: boolean }) => {
      this.isDirty = status.dirty;
    });
  }

  /**
   * @param newMode {ViewMode}
   */
  public switchViewMode(newMode: ViewMode) {
    this.appState.viewMode = newMode;
    this.saveState();
  }

  /**
   * Destroys and cleans up this object when it's no longer used.
   */
  public destroy() {
    if (this.stateMonitor) {
      this.stateMonitor.destroy();
    }
    this.savedDashboard.destroy();
    this.unsubscribe();
  }
}
