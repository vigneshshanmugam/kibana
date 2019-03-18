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
import { SearchSource } from 'ui/courier';
import * as columnActions from 'ui/doc_table/actions/columns';
import {
  APPLY_FILTER_TRIGGER,
  Embeddable,
  getTrigger,
  SHOW_EDIT_MODE_TRIGGER,
  SHOW_VIEW_MODE_TRIGGER,
  TimeRange,
  Trigger,
} from 'ui/embeddable';
import { OutputSpec } from 'ui/embeddable/embeddables/embeddable_factory';
import { Filters, Query } from 'ui/embeddable/types';
import { generateFilters } from 'ui/filter_manager/generate_filter_shape';
import { StaticIndexPattern } from 'ui/index_patterns';
import { RequestAdapter } from 'ui/inspector/adapters';
import { Adapters } from 'ui/inspector/types';
import { getTime } from 'ui/timefilter/get_time';
import { SavedSearch } from '../types';
import {
  SEARCH_EMBEDDABLE_TYPE,
  SEARCH_OUTPUT_SPEC,
  SearchEmbeddableFactory,
} from './search_embeddable_factory';
import { SEARCH_ROW_CLICK_TRIGGER } from './search_embeddable_factory_provider';
import searchTemplate from './search_template.html';

interface SearchScope extends ng.IScope {
  columns?: string[];
  description?: string;
  sort?: string[];
  searchSource?: SearchSource;
  sharedItemTitle?: string;
  inspectorAdapters?: Adapters;
  setSortOrder?: (column: string, columnDirection: string) => void;
  removeColumn?: (column: string) => void;
  addColumn?: (column: string) => void;
  moveColumn?: (column: string, index: number) => void;
  filter?: (field: string, value: string, operator: string) => void;
}

interface SearchEmbeddableCustomization {
  sort?: string[];
  columns?: string[];
}

interface SearchEmbeddableConfig {
  savedSearch: SavedSearch;
  editUrl: string;
  $rootScope: ng.IRootScopeService;
  $compile: ng.ICompileService;
  factory: SearchEmbeddableFactory;
  id: string;
  courier: any;
}

interface SearchOverrides {
  columns: string[];
  sort?: string[];
  title: string;
}

export interface SearchInput {
  timeRange?: TimeRange;
  query?: Query;
  filters?: Filters;
  hidePanelTitles?: boolean;
  embeddableCustomization: SearchOverrides;
}

export interface SearchOutput {
  title: string;
  editUrl: string;
  indexPatterns?: StaticIndexPattern[];
  stagedFilter?: {
    field: string;
    value: string;
    operator: string;
    index: string;
  };
  customization: SearchEmbeddableCustomization;
  actionContext: {
    clickContext?: Filters;
  };
  timeRange?: TimeRange;
  query?: Query;
  filters?: Filters;
}

export class SearchEmbeddable extends Embeddable<SearchInput, SearchOutput> {
  private readonly savedSearch: SavedSearch;
  private $rootScope: ng.IRootScopeService;
  private $compile: ng.ICompileService;
  private inspectorAdaptors: Adapters;
  private searchScope?: SearchScope;
  private panelTitle: string = '';
  private filtersSearchSource: SearchSource;
  private searchInstance?: JQLite;
  private courier: any;

  constructor(
    { savedSearch, editUrl, $rootScope, $compile, factory, id, courier }: SearchEmbeddableConfig,
    initialInput: SearchInput
  ) {
    super(
      { type: SEARCH_EMBEDDABLE_TYPE, id, factory },
      {
        editUrl,
        title: savedSearch.title,
        indexPatterns: _.compact([savedSearch.searchSource.getField('index')]),
        customization: {},
        timeRange: initialInput.timeRange,
        filters: initialInput.filters,
        query: initialInput.query,
        actionContext: {},
      },
      initialInput
    );

    this.courier = courier;
    this.savedSearch = savedSearch;
    this.$rootScope = $rootScope;
    this.$compile = $compile;
    this.inspectorAdaptors = {
      requests: new RequestAdapter(),
    };
  }

  public getInspectorAdapters() {
    return this.inspectorAdaptors;
  }

  public onInputChanged(input: SearchInput) {
    console.log('Search Embeddable:OnInputChanged, filters are ' + JSON.stringify(input.filters));
    this.input = input;
    this.output.customization = input.embeddableCustomization || {};
    this.panelTitle = '';
    if (!input.hidePanelTitles) {
      this.panelTitle =
        input.embeddableCustomization.title !== undefined
          ? input.embeddableCustomization.title
          : this.savedSearch.title;
    }

    if (this.searchScope) {
      this.pushContainerStateParamsToScope(this.searchScope);
    }
  }

  /**
   *
   * @param {Element} domNode
   * @param {ContainerState} containerState
   */
  public render(domNode: HTMLElement) {
    console.log('render saved search');
    this.initializeSearchScope();
    if (!this.searchScope) {
      throw new Error('Search scope not defined');
      return;
    }
    this.searchInstance = this.$compile(searchTemplate)(this.searchScope);
    const rootNode = angular.element(domNode);
    rootNode.append(this.searchInstance);

    this.pushContainerStateParamsToScope(this.searchScope);
  }

  public destroy() {
    this.savedSearch.destroy();
    if (this.searchInstance) {
      this.searchInstance.remove();
    }
    if (this.searchScope) {
      this.searchScope.$destroy();
      delete this.searchScope;
    }
  }

  public supportsTrigger(trigger: Trigger) {
    return !![SHOW_EDIT_MODE_TRIGGER, SHOW_VIEW_MODE_TRIGGER, APPLY_FILTER_TRIGGER].find(
      id => id === trigger.id
    );
  }

  public getOutputSpec(trigger?: Trigger) {
    if (!this.searchScope || !this.searchScope.columns) {
      return {};
    }

    let outputSpec: OutputSpec = {};

    if (trigger && trigger.id === SEARCH_ROW_CLICK_TRIGGER) {
      this.searchScope.columns.forEach(column => {
        const columnId = column.replace(/\s/g, '');
        outputSpec[columnId] = {
          displayName: 'Clicked row cell',
          description: 'The value of the cell that was clicked on',
          accessPath: `triggerContext.${columnId.replace(/\s/g, '')}`,
          id: columnId,
        };
      });
    } else if (trigger && trigger.id === APPLY_FILTER_TRIGGER) {
      outputSpec = {
        ['fieldName']: {
          displayName: 'Clicked column name',
          description: 'A filter that was clicked on',
          accessPath: 'triggerContext.fieldName',
          id: 'fieldName',
        },
        ['fieldValue']: {
          displayName: 'Clicked cell value',
          description: 'The value of the cell that was clicked on',
          accessPath: 'triggerContext.fieldValue',
          id: 'fieldValue',
        },
      };
    }

    outputSpec = {
      ...outputSpec,
      ...SEARCH_OUTPUT_SPEC,
    };

    Object.values(outputSpec).forEach(propertySpec => {
      if (!this.output.hasOwnProperty(propertySpec.accessPath.substr('element.'.length))) {
        console.log('error no property ' + propertySpec.accessPath.substr('element.'.length));
        return;
      }
      const value = this.output[propertySpec.accessPath.substr('element.'.length)];

      if (typeof value === 'object') {
        outputSpec[propertySpec.id].value = JSON.stringify(value);
      } else {
        outputSpec[propertySpec.id].value = value;
      }
    });

    return outputSpec;
  }

  private initializeSearchScope() {
    const searchScope: SearchScope = this.$rootScope.$new();

    searchScope.description = this.savedSearch.description;
    searchScope.searchSource = this.savedSearch.searchSource;
    searchScope.inspectorAdapters = this.inspectorAdaptors;

    const timeRangeSearchSource = searchScope.searchSource.create();
    timeRangeSearchSource.setField('filter', () => {
      if (!this.searchScope || !this.input.timeRange) {
        return;
      }
      return getTime(this.searchScope.searchSource.getField('index'), this.input.timeRange);
    });

    this.filtersSearchSource = searchScope.searchSource.create();
    this.filtersSearchSource.setParent(timeRangeSearchSource);

    searchScope.searchSource.setParent(this.filtersSearchSource);

    this.pushContainerStateParamsToScope(searchScope);

    searchScope.setSortOrder = (columnName, direction) => {
      searchScope.sort = this.output.customization.sort = [columnName, direction];
      this.emitOutputChange(this.getOutput());
    };

    searchScope.addColumn = (columnName: string) => {
      if (!searchScope.columns) {
        return;
      }
      this.savedSearch.searchSource.getField('index').popularizeField(columnName, 1);
      columnActions.addColumn(searchScope.columns, columnName);
      searchScope.columns = this.output.customization.columns = searchScope.columns;
      this.emitOutputChange(this.getOutput());
    };

    searchScope.removeColumn = (columnName: string) => {
      if (!searchScope.columns) {
        return;
      }
      this.savedSearch.searchSource.getField('index').popularizeField(columnName, 1);
      columnActions.removeColumn(searchScope.columns, columnName);
      this.output.customization.columns = searchScope.columns;
      this.emitOutputChange(this.getOutput());
    };

    searchScope.moveColumn = (columnName, newIndex: number) => {
      if (!searchScope.columns) {
        return;
      }
      columnActions.moveColumn(searchScope.columns, columnName, newIndex);
      this.output.customization.columns = searchScope.columns;
      this.emitOutputChange(this.getOutput());
    };

    searchScope.filter = async (field, value, operator) => {
      const index = this.savedSearch.searchSource.getField('index').id;
      const stagedFilter = {
        field,
        value,
        operation: operator,
        index,
      };

      let filters = generateFilters(stagedFilter);
      filters = filters.map(filter => ({
        ...filter,
        $state: { store: 'appState' },
      }));
      const fieldName = Object.keys(filters[0].query.match)[0];
      const fieldValue = filters[0].query.match[fieldName].query;

      this.output.actionContext.clickContext = {
        stagedFilter,
        fieldName,
        fieldValue,
        filters,
      };

      const trigger = await getTrigger(APPLY_FILTER_TRIGGER);
      trigger.execute({
        embeddable: this,
        container: this.container,
        triggerContext: {
          fieldName,
          fieldValue,
          stagedFilter,
          filters,
        },
      });

      // const filterActions = trigger.getCompatibleActions({ embeddable: this });

      // if (filterActions.length > 0) {
      //   filterActions[filterActions.length - 1].execute({
      //     embeddable: this,
      //     container: this.container,
      //     triggerContext: {
      //       fieldName,
      //       fieldValue,
      //       stagedFilter,
      //       filters,
      //     },
      //   });
      // }
    };

    searchScope.onRowClick = async (row: { [key: string]: string }) => {
      const cleanRows: { [key: string]: string } = {};
      Object.keys(row).forEach(key => {
        cleanRows[key.replace(/\s/g, '')] = row[key];
      });

      const trigger = await getTrigger(SEARCH_ROW_CLICK_TRIGGER);
      const searchRowClickActions = trigger.getCompatibleActions({ embeddable: this });

      if (searchRowClickActions.length > 0) {
        searchRowClickActions[searchRowClickActions.length - 1].execute({
          embeddable: this,
          container: this.container,
          triggerContext: {
            ...cleanRows,
          },
        });
      }
    };

    this.searchScope = searchScope;
  }

  private emitOutputChange(output: SearchOutput) {
    this.emitOutputChanged(output);
  }

  private pushContainerStateParamsToScope(searchScope: SearchScope) {
    // If there is column or sort data on the panel, that means the original columns or sort settings have
    // been overridden in a dashboard.
    searchScope.columns = this.output.customization.columns || this.savedSearch.columns;
    searchScope.sort = this.output.customization.sort || this.savedSearch.sort;
    searchScope.sharedItemTitle = this.panelTitle;

    // Awful hack to get search sources to send out an initial query. Angular should be going away
    // soon and we can get rid of this.
    if (searchScope.searchSource) {
      if (!searchScope.$$phase) {
        searchScope.$apply(() => {
          searchScope.searchSource.triggerFetch = searchScope.searchSource.triggerFetch
            ? searchScope.searchSource.triggerFetch + 1
            : 1;
        });
      }
    }

    this.filtersSearchSource.setField('filter', this.input.filters);
    this.filtersSearchSource.setField('query', this.input.query);

    // Sadly this is neccessary to tell the angular component to refetch the data.
    this.courier.fetch();
  }
}
