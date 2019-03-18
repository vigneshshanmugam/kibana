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
import angular from 'angular';
import _ from 'lodash';
import React from 'react';
// @ts-ignore
import rison from 'rison-node';
import chrome from 'ui/chrome';
import { IndexPattern } from 'ui/index_patterns';

// @ts-ignore
import { uiModules } from 'ui/modules';
import { toastNotifications } from 'ui/notify';

import 'ui/apply_filters';
import 'ui/search_bar';

// @ts-ignore
import * as filterActions from 'ui/doc_table/actions/filter';

// @ts-ignore
import { DocTitleProvider } from 'ui/doc_title';
import { EmbeddableFactoriesRegistryProvider, Filter, ViewMode } from 'ui/embeddable';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
// @ts-ignore
import { FilterManagerProvider } from 'ui/filter_manager';
// @ts-ignore
import { ConfirmationButtonTypes } from 'ui/modals/confirm_modal';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
// @ts-ignore
import { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';
// @ts-ignore
import { ShareContextMenuExtensionsRegistryProvider, showShareContextMenu } from 'ui/share';
// @ts-ignore
import { getUnhashableStatesProvider } from 'ui/state_management/state_hashing';
// @ts-ignore
import { getDashboardTitle } from './dashboard_strings';
// @ts-ignore
import { saveDashboard } from './lib';
// @ts-ignore
import { getTopNavConfig } from './top_nav/get_top_nav_config';

// @ts-ignore
import { DashboardSaveModal } from './top_nav/save_modal';
// @ts-ignore
import { showAddPanel } from './top_nav/show_add_panel';
// @ts-ignore
import { showCloneModal } from './top_nav/show_clone_modal';
// @ts-ignore
import { showOptionsPopover } from './top_nav/show_options_popover';

// @ts-ignore
import { TopNavIds } from './top_nav/top_nav_ids';

// @ts-ignore
import { DASHBOARD_CONTAINER_TYPE } from 'plugins/dashboard_embeddable/embeddable/dashboard_container_factory';

import {
  DashboardContainer,
  PanelState,
} from 'src/legacy/core_plugins/dashboard_embeddable/public';

import { AppState } from 'ui/state_management/app_state';
import { timefilter } from 'ui/timefilter';
import { TimeRange } from 'ui/timefilter/time_history';
import { migrateLegacyQuery } from 'ui/utils/migrate_legacy_query';
import { Query } from 'ui/visualize';
import { QueryLanguageType } from 'ui/visualize/loader/types';
import { showNewVisModal } from '../visualize/wizard';
import { createDashboardEditUrl, DashboardConstants } from './dashboard_constants';
import { DashboardStateManager } from './dashboard_state_manager';
import { SavedObjectDashboard } from './saved_dashboard/saved_dashboard';

interface DashboardAppScope extends ng.IScope {
  dash: SavedObjectDashboard;
  appState: AppState;
  model: {
    query: Query;
    filters: Filter[];
    timeRestore: boolean;
    title: string;
    description: string;
    timeRange: TimeRange;
    refreshInterval: any;
  };
  panels: PanelState[];
  indexPatterns: any;
  $evalAsync: any;
  dashboardViewMode: ViewMode;
  lastReloadRequestTime: number;
  expandedPanel?: string;
  getShouldShowEditHelp: () => boolean;
  getShouldShowViewHelp: () => boolean;
  updateQueryAndFetch: ({ query, dateRange }: { query: Query; dateRange?: TimeRange }) => void;
  onRefreshChange: (
    { isPaused, refreshInterval }: { isPaused: boolean; refreshInterval: any }
  ) => void;
  onFiltersUpdated: (filters: Filter[]) => void;
  $listenAndDigestAsync: any;
  onCancelApplyFilters: () => void;
  onApplyFilters: (filters: Filter[]) => void;
  topNavMenu: any;
  showFilterBar: () => boolean;
  showAddPanel: any;
  kbnTopNav: any;
  enterEditMode: () => void;
  $listen: any;
}

export class DashboardAppController {
  private appStatus: { dirty: boolean };
  private $scope: DashboardAppScope;

  constructor({
    $scope,
    $route,
    $routeParams,
    getAppState,
    dashboardConfig,
    localStorage,
    i18n,
    Private,
    kbnUrl,
    AppStateClass,
    indexPatterns,
    config,
    confirmModal,
  }: {
    $scope: DashboardAppScope;
    $route: any;
    $routeParams: any;
    getAppState: any;
    indexPatterns: any;
    dashboardConfig: any;
    localStorage: any;
    i18n: any;
    Private: any;
    kbnUrl: any;
    AppStateClass: any;
    config: any;
    confirmModal: any;
  }) {
    const filterManager = Private(FilterManagerProvider);
    const queryFilter = Private(FilterBarQueryFilterProvider);
    const docTitle = Private(DocTitleProvider);
    const embeddableFactories = Private(EmbeddableFactoriesRegistryProvider);
    const getUnhashableStates = Private(getUnhashableStatesProvider);
    const shareContextMenuExtensions = Private(ShareContextMenuExtensionsRegistryProvider);

    const visTypes = Private(VisTypesRegistryProvider);

    const dash = ($scope.dash = $route.current.locals.dash);
    if (dash.id) {
      docTitle.change(dash.title);
    }

    this.$scope = $scope;

    const dashboardStateManager = new DashboardStateManager({
      savedDashboard: dash,
      AppStateClass,
      hideWriteControls: dashboardConfig.getHideWriteControls(),
      addFilter: ({
        field,
        value,
        operator,
        index,
      }: {
        field: string;
        value: string;
        operator: string;
        index: string;
      }) => {
        filterActions.addFilter(
          field,
          value,
          operator,
          index,
          dashboardStateManager.getAppState(),
          filterManager
        );
      },
    });

    // This is for actions to dynamically merge extra filters.
    const addFilters = $route.current.params.addFilters;
    if (addFilters) {
      const filtersParsed = rison.decode(addFilters);
      queryFilter.addFilters(filtersParsed);
    }

    $scope.appState = dashboardStateManager.getAppState();

    // The 'previouslyStored' check is so we only update the time filter on dashboard open, not during
    // normal cross app navigation.
    if (dashboardStateManager.getIsTimeSavedWithDashboard() && !getAppState.previouslyStored()) {
      dashboardStateManager.syncTimefilterWithDashboard(timefilter);
    }

    const updateState = () => {
      // Following the "best practice" of always have a '.' in your ng-models –
      // https://github.com/angular/angular.js/wiki/Understanding-Scopes
      $scope.model = {
        query: dashboardStateManager.getQuery(),
        filters: queryFilter.getFilters(),
        timeRestore: dashboardStateManager.getTimeRestore(),
        title: dashboardStateManager.getTitle(),
        description: dashboardStateManager.getDescription(),
        timeRange: timefilter.getTime(),
        refreshInterval: timefilter.getRefreshInterval(),
      };

      // Hack for drilldown links to add query.  TODO: remove after demo. Not to be included in phase 1
      const staticQuery = $route.current.params.staticQuery;
      if (staticQuery) {
        $scope.model.query = { query: staticQuery, language: QueryLanguageType.KUERY };
        if ($scope.appState) {
          $scope.appState.query = { query: staticQuery, language: QueryLanguageType.KUERY };
        }
        kbnUrl.removeParam('staticQuery');
      }

      $scope.panels = dashboardStateManager.getPanels();

      const panelIndexPatterns = dashboardStateManager.getPanelIndexPatterns();
      if (panelIndexPatterns && panelIndexPatterns.length > 0) {
        $scope.indexPatterns = panelIndexPatterns;
      } else {
        indexPatterns.getDefault().then((defaultIndexPattern: IndexPattern) => {
          $scope.$evalAsync(() => {
            $scope.indexPatterns = [defaultIndexPattern];
          });
        });
      }
    };

    // Part of the exposed plugin API - do not remove without careful consideration.
    this.appStatus = {
      dirty: !dash.id,
    };

    dashboardStateManager.registerChangeListener((status: { dirty: boolean }) => {
      this.appStatus.dirty = status.dirty || !dash.id;
      updateState();
    });

    dashboardStateManager.applyFilters(
      dashboardStateManager.getQuery() || {
        query: '',
        language:
          localStorage.get('kibana.userQueryLanguage') || config.get('search:queryLanguage'),
      },
      queryFilter.getFilters()
    );

    timefilter.disableTimeRangeSelector();
    timefilter.disableAutoRefreshSelector();

    updateState();

    // dashboardStateManager.handleTimeChange(timefilter.getTime());
    // dashboardStateManager.handleRefreshConfigChange(timefilter.getRefreshInterval());

    const dashboardDom = document.getElementById('dashboardViewport');
    const dashboardFactory = embeddableFactories.byName[DASHBOARD_CONTAINER_TYPE];

    let dashboardEmbeddable: DashboardContainer;

    const getDashboardInput = () => {
      const panelsMap: { [key: string]: PanelState } = {};
      dashboardStateManager.getPanels().forEach((panel: PanelState) => {
        panelsMap[panel.panelIndex] = panel;
      });
      return {
        filters: $scope.model.filters,
        hidePanelTitles: dashboardStateManager.getHidePanelTitles(),
        query: $scope.model.query,
        timeRange: {
          from: timefilter.getTime().from,
          to: timefilter.getTime().to,
        },
        refreshConfig: timefilter.getRefreshInterval(),
        viewMode: dashboardStateManager.getViewMode(),
        panels: panelsMap,
        isFullScreenMode: dashboardStateManager.getFullScreenMode(),
        useMargins: dashboardStateManager.getUseMargins(),
        lastReloadRequestTime: $scope.lastReloadRequestTime,
        title: dashboardStateManager.getTitle(),
        description: dashboardStateManager.getDescription(),
      };
    };

    const refreshDashboardEmbeddable = () => {
      if (!dashboardEmbeddable) {
        return;
      }
      const dashboardInput = getDashboardInput();
      const mergedInput = {
        ...dashboardEmbeddable.getOutput(),
        ...dashboardInput,
      };
      if (!_.isEqual(dashboardEmbeddable.getOutput(), mergedInput)) {
        dashboardEmbeddable.onInputChanged({
          ...dashboardEmbeddable.getOutput(),
          ...dashboardInput,
        });
      }
    };

    dashboardFactory.setGetEmbeddableFactory((type: string) => embeddableFactories.byName[type]);
    dashboardFactory
      .create({ id: saveDashboard.id }, getDashboardInput())
      .then((dashboardEmbeddableIn: DashboardContainer) => {
        dashboardEmbeddable = dashboardEmbeddableIn;
        dashboardEmbeddable.onOutputChanged(output => {
          dashboardStateManager.handleDashboardEmbeddableChanges(output);
          queryFilter.setFilters(output.filters);

          // if (output.filters && !_.isEqual(output.filters, dashboardState.view.filters)) {
          //   queryFilter.setFilters(output.filters);
          //   dashboardStateManager.setFilters(output.filters);
          // }

          // if (output.panels && !_.isEqual(output.panels, dashboardState.panels)) {
          //   dashboardStateManager.setFilters(output.filters);
          //   store.dispatch(setPanels(output.panels));
          // }

          // const panelIndexPatterns = dashboardEmbeddable.getPanelIndexPatterns();
          // if (panelIndexPatterns && panelIndexPatterns.length > 0) {
          //   $scope.indexPatterns = panelIndexPatterns;
          // }
          // else {
          //   indexPatterns.getDefault().then((defaultIndexPattern) => {
          //     $scope.$evalAsync(() => {
          //       $scope.indexPatterns = [defaultIndexPattern];
          //     });
          //   });
          // }
        });

        dashboardEmbeddable.render(dashboardDom);
        dashboardStateManager.registerChangeListener(refreshDashboardEmbeddable);
      });

    // Push breadcrumbs to new header navigation
    const updateBreadcrumbs = () => {
      chrome.breadcrumbs.set([
        {
          text: i18n('kbn.dashboard.dashboardAppBreadcrumbsTitle', {
            defaultMessage: 'Dashboard',
          }),
          href: `#${DashboardConstants.LANDING_PAGE_PATH}`,
        },
        {
          text: getDashboardTitle(
            dashboardStateManager.getTitle(),
            dashboardStateManager.getViewMode(),
            dashboardStateManager.getIsDirty(timefilter)
          ),
        },
      ]);
    };
    updateBreadcrumbs();
    dashboardStateManager.registerChangeListener(updateBreadcrumbs);

    $scope.getShouldShowEditHelp = () =>
      !dashboardStateManager.getPanels().length &&
      dashboardStateManager.getIsEditMode() &&
      !dashboardConfig.getHideWriteControls();
    $scope.getShouldShowViewHelp = () =>
      !dashboardStateManager.getPanels().length &&
      dashboardStateManager.getIsViewMode() &&
      !dashboardConfig.getHideWriteControls();

    $scope.updateQueryAndFetch = ({ query, dateRange }) => {
      timefilter.setTime(dateRange);

      const oldQuery = $scope.model.query;
      if (_.isEqual(oldQuery, query)) {
        // The user can still request a reload in the query bar, even if the
        // query is the same, and in that case, we have to explicitly ask for
        // a reload, since no state changes will cause it.
        $scope.lastReloadRequestTime = new Date().getTime();
        refreshDashboardEmbeddable();
      } else {
        $scope.model.query = query;
        // dashboardStateManager.applyFilters($scope.model.query, $scope.model.filters);
      }
    };

    $scope.onRefreshChange = ({ isPaused, refreshInterval }) => {
      timefilter.setRefreshInterval({
        pause: isPaused,
        value: refreshInterval ? refreshInterval : $scope.model.refreshInterval.value,
      });
    };

    $scope.onFiltersUpdated = filters => {
      // The filters will automatically be set when the queryFilter emits an update event (see below)
      queryFilter.setFilters(filters);
    };

    $scope.onCancelApplyFilters = () => {
      $scope.appState.$newFilters = [];
    };

    $scope.onApplyFilters = filters => {
      queryFilter.addFiltersAndChangeTimeFilter(filters);
      $scope.appState.$newFilters = [];
    };

    $scope.$watch('appState.$newFilters', (filters: Filter[] = []) => {
      if (filters.length === 1) {
        $scope.onApplyFilters(filters);
      }
    });

    $scope.indexPatterns = [];

    $scope.$watch('model.query', (newQuery: Query) => {
      const query = migrateLegacyQuery(newQuery);
      $scope.updateQueryAndFetch({ query });
    });

    $scope.$listenAndDigestAsync(timefilter, 'refreshIntervalUpdate', () => {
      updateState();
    });

    $scope.$listenAndDigestAsync(timefilter, 'timeUpdate', updateState);

    function updateViewMode(newMode: ViewMode) {
      $scope.topNavMenu = getTopNavConfig(
        newMode,
        navActions,
        dashboardConfig.getHideWriteControls()
      ); // eslint-disable-line no-use-before-define
      dashboardStateManager.switchViewMode(newMode);
    }

    const onChangeViewMode = (newMode: ViewMode) => {
      const isPageRefresh = newMode === dashboardStateManager.getViewMode();
      const isLeavingEditMode = !isPageRefresh && newMode === ViewMode.VIEW;
      const willLoseChanges = isLeavingEditMode && dashboardStateManager.getIsDirty(timefilter);

      if (!willLoseChanges) {
        updateViewMode(newMode);
        return;
      }

      function revertChangesAndExitEditMode() {
        dashboardStateManager.resetState();
        kbnUrl.change(
          dash.id ? createDashboardEditUrl(dash.id) : DashboardConstants.CREATE_NEW_DASHBOARD_URL
        );
        // This is only necessary for new dashboards, which will default to Edit mode.
        updateViewMode(ViewMode.VIEW);

        // We need to do a hard reset of the timepicker. appState will not reload like
        // it does on 'open' because it's been saved to the url and the getAppState.previouslyStored() check on
        // reload will cause it not to sync.
        if (dashboardStateManager.getIsTimeSavedWithDashboard()) {
          dashboardStateManager.syncTimefilterWithDashboard(timefilter);
        }
      }

      confirmModal(
        i18n('kbn.dashboard.changeViewModeConfirmModal.discardChangesDescription', {
          defaultMessage: `Once you discard your changes, there's no getting them back.`,
        }),
        {
          onConfirm: revertChangesAndExitEditMode,
          onCancel: _.noop,
          confirmButtonText: i18n('kbn.dashboard.changeViewModeConfirmModal.confirmButtonLabel', {
            defaultMessage: 'Discard changes',
          }),
          cancelButtonText: i18n('kbn.dashboard.changeViewModeConfirmModal.cancelButtonLabel', {
            defaultMessage: 'Continue editing',
          }),
          defaultFocusedButton: ConfirmationButtonTypes.CANCEL,
          title: i18n('kbn.dashboard.changeViewModeConfirmModal.discardChangesTitle', {
            defaultMessage: 'Discard changes to dashboard?',
          }),
        }
      );
    };

    /**
     * Saves the dashboard.
     *
     * @param {object} [saveOptions={}]
     * @property {boolean} [saveOptions.confirmOverwrite=false] - If true, attempts to create the source so it
     * can confirm an overwrite if a document with the id already exists.
     * @property {boolean} [saveOptions.isTitleDuplicateConfirmed=false] - If true, save allowed with duplicate title
     * @property {func} [saveOptions.onTitleDuplicate] - function called if duplicate title exists.
     * When not provided, confirm modal will be displayed asking user to confirm or cancel save.
     * @return {Promise}
     * @resolved {String} - The id of the doc
     */
    function save(saveOptions: any) {
      return saveDashboard(angular.toJson, timefilter, dashboardStateManager, saveOptions)
        .then((id: string) => {
          if (id) {
            toastNotifications.addSuccess({
              title: i18n('kbn.dashboard.dashboardWasSavedSuccessMessage', {
                defaultMessage: `Dashboard '{dashTitle}' was saved`,
                values: { dashTitle: dash.title },
              }),
              'data-test-subj': 'saveDashboardSuccess',
            });

            if (dash.id !== $routeParams.id) {
              kbnUrl.change(createDashboardEditUrl(dash.id));
            } else {
              docTitle.change(dash.lastSavedTitle);
              updateViewMode(ViewMode.VIEW);
            }
          }
          return { id };
        })
        .catch((error: { message: string }) => {
          toastNotifications.addDanger({
            title: i18n('kbn.dashboard.dashboardWasNotSavedDangerMessage', {
              defaultMessage: `Dashboard '{dashTitle}' was not saved. Error: {errorMessage}`,
              values: {
                dashTitle: dash.title,
                errorMessage: error.message,
              },
            }),
            'data-test-subj': 'saveDashboardFailure',
          });
          return { error };
        });
    }

    $scope.showFilterBar = () =>
      $scope.model.filters.length > 0 || !dashboardStateManager.getFullScreenMode();

    $scope.showAddPanel = () => {
      dashboardStateManager.setFullScreenMode(false);
      $scope.kbnTopNav.click(TopNavIds.ADD);
    };
    $scope.enterEditMode = () => {
      dashboardStateManager.setFullScreenMode(false);
      $scope.kbnTopNav.click('edit');
    };
    const navActions: {
      [key: string]: (menuItem: any, navController: any, anchorElement: any) => void;
    } = {};
    navActions[TopNavIds.FULL_SCREEN] = () => dashboardStateManager.setFullScreenMode(true);
    navActions[TopNavIds.EXIT_EDIT_MODE] = () => onChangeViewMode(ViewMode.VIEW);
    navActions[TopNavIds.ENTER_EDIT_MODE] = () => onChangeViewMode(ViewMode.EDIT);
    navActions[TopNavIds.SAVE] = () => {
      const currentTitle = dashboardStateManager.getTitle();
      const currentDescription = dashboardStateManager.getDescription();
      const currentTimeRestore = dashboardStateManager.getTimeRestore();
      const onSave = ({
        newTitle,
        newDescription,
        newCopyOnSave,
        newTimeRestore,
        isTitleDuplicateConfirmed,
        onTitleDuplicate,
      }: {
        newTitle: string;
        newDescription: string;
        newCopyOnSave: boolean;
        newTimeRestore: boolean;
        isTitleDuplicateConfirmed: boolean;
        onTitleDuplicate: () => void;
      }) => {
        dashboardStateManager.setTitle(newTitle);
        dashboardStateManager.setDescription(newDescription);
        dashboardStateManager.savedDashboard.copyOnSave = newCopyOnSave;
        dashboardStateManager.setTimeRestore(newTimeRestore);
        const saveOptions = {
          confirmOverwrite: false,
          isTitleDuplicateConfirmed,
          onTitleDuplicate,
        };
        return save(saveOptions).then(
          ({ id, error }: { id?: string; error?: { message: string } }) => {
            // If the save wasn't successful, put the original values back.
            if (!id || error) {
              dashboardStateManager.setTitle(currentTitle);
              dashboardStateManager.setDescription(currentDescription);
              dashboardStateManager.setTimeRestore(currentTimeRestore);
            }
            return { id, error };
          }
        );
      };

      const dashboardSaveModal = (
        <DashboardSaveModal
          onSave={onSave}
          onClose={() => {
            return;
          }}
          title={currentTitle}
          description={currentDescription}
          timeRestore={currentTimeRestore}
          showCopyOnSave={dash.id ? true : false}
        />
      );
      showSaveModal(dashboardSaveModal);
    };
    navActions[TopNavIds.CLONE] = () => {
      const currentTitle = dashboardStateManager.getTitle();
      const onClone = (
        newTitle: string,
        isTitleDuplicateConfirmed: boolean,
        onTitleDuplicate: boolean
      ) => {
        dashboardStateManager.savedDashboard.copyOnSave = true;
        dashboardStateManager.setTitle(newTitle);
        const saveOptions = {
          confirmOverwrite: false,
          isTitleDuplicateConfirmed,
          onTitleDuplicate,
        };
        return save(saveOptions).then(
          ({ id, error }: { id?: string; error?: { message: string } }) => {
            // If the save wasn't successful, put the original title back.
            if (!id || error) {
              dashboardStateManager.setTitle(currentTitle);
            }
            return { id, error };
          }
        );
      };

      showCloneModal(onClone, currentTitle);
    };
    navActions[TopNavIds.ADD] = () => {
      const addNewVis = () => {
        showNewVisModal(visTypes, {
          editorParams: [DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM],
        });
      };

      showAddPanel(dashboardStateManager.addNewPanel, addNewVis, embeddableFactories);
    };
    navActions[TopNavIds.OPTIONS] = (menuItem, navController, anchorElement) => {
      showOptionsPopover({
        anchorElement,
        useMargins: dashboardStateManager.getUseMargins(),
        onUseMarginsChange: (isChecked: boolean) => {
          dashboardStateManager.setUseMargins(isChecked);
        },
        hidePanelTitles: dashboardStateManager.getHidePanelTitles(),
        onHidePanelTitlesChange: (isChecked: boolean) => {
          dashboardStateManager.setHidePanelTitles(isChecked);
        },
      });
    };
    navActions[TopNavIds.SHARE] = (menuItem, navController, anchorElement) => {
      showShareContextMenu({
        anchorElement,
        allowEmbed: true,
        getUnhashableStates,
        objectId: dash.id,
        objectType: 'dashboard',
        shareContextMenuExtensions,
        sharingData: {
          title: dash.title,
        },
        isDirty: dashboardStateManager.getIsDirty(),
      });
    };

    updateViewMode(dashboardStateManager.getViewMode());

    // update root source when filters update
    $scope.$listen(queryFilter, 'update', () => {
      $scope.model.filters = queryFilter.getFilters();
      dashboardStateManager.applyFilters($scope.model.query, $scope.model.filters);
    });

    // update data when filters fire fetch event
    // $scope.$listen(queryFilter, 'fetch', $scope.refresh);

    $scope.$on('$destroy', () => {
      dashboardStateManager.destroy();
    });

    if (
      $route.current.params &&
      $route.current.params[DashboardConstants.NEW_VISUALIZATION_ID_PARAM]
    ) {
      dashboardStateManager.addNewPanel(
        $route.current.params[DashboardConstants.NEW_VISUALIZATION_ID_PARAM],
        'visualization'
      );

      kbnUrl.removeParam(DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM);
      kbnUrl.removeParam(DashboardConstants.NEW_VISUALIZATION_ID_PARAM);
    }
  }
}
