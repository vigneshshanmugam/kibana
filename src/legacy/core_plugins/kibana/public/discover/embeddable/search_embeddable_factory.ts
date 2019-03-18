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

import 'ui/doc_table';

import { i18n } from '@kbn/i18n';
import { EmbeddableFactory } from 'ui/embeddable';
import { EmbeddableInstanceConfiguration, OnEmbeddableStateChanged } from 'ui/embeddable';
import { ErrorEmbeddable } from 'ui/embeddable/embeddables/error_embeddable';
import { SavedSearchLoader } from '../types';
import { SearchEmbeddable, SearchInput, SearchOutput } from './search_embeddable';

export const SEARCH_EMBEDDABLE_TYPE = 'search';

export const SEARCH_OUTPUT_SPEC = {
  ['title']: {
    displayName: 'Title',
    description: 'The title of the element',
    accessPath: 'element.title',
    id: 'title',
  },
  ['timeRange']: {
    displayName: 'Time range',
    description: 'The time range. Object type that has from and to nested properties.',
    accessPath: 'element.timeRange',
    id: 'timeRange',
  },
  ['filters']: {
    displayName: 'Filters',
    description: 'The filters applied to the current view',
    accessPath: 'element.filters',
    id: 'filters',
  },
  ['query']: {
    displayName: 'Query',
    description: 'The query applied to the current view',
    accessPath: 'element.query',
    id: 'query',
  },
};

export class SearchEmbeddableFactory extends EmbeddableFactory<SearchInput, SearchOutput> {
  constructor(
    private $compile: ng.ICompileService,
    private $rootScope: ng.IRootScopeService,
    private searchLoader: SavedSearchLoader,
    private courier: any
  ) {
    super({
      name: SEARCH_EMBEDDABLE_TYPE,
      savedObjectMetaData: {
        name: i18n.translate('kbn.discover.savedSearch.savedObjectName', {
          defaultMessage: 'Saved search',
        }),
        type: 'search',
        getIconForSavedObject: () => 'search',
      },
    });
  }

  public getEditPath(panelId: string) {
    return this.searchLoader.urlFor(panelId);
  }

  public getOutputSpec() {
    return SEARCH_OUTPUT_SPEC;
  }

  /**
   *
   * @param panelMetadata. Currently just passing in panelState but it's more than we need, so we should
   * decouple this to only include data given to us from the embeddable when it's added to the dashboard. Generally
   * will be just the object id, but could be anything depending on the plugin.
   * @param onEmbeddableStateChanged
   * @return
   */
  public create({ id, savedObjectId }: EmbeddableInstanceConfiguration, initialInput: SearchInput) {
    if (!savedObjectId) {
      return new ErrorEmbeddable('Need a saved object id to load search embeddable');
    }

    const editUrl = this.getEditPath(savedObjectId);

    // can't change this to be async / awayt, because an Anglular promise is expected to be returned.
    return this.searchLoader.get(savedObjectId).then(savedObject => {
      return new SearchEmbeddable(
        {
          id,
          courier: this.courier,
          savedSearch: savedObject,
          editUrl,
          $rootScope: this.$rootScope,
          $compile: this.$compile,
          factory: this,
        },
        initialInput
      );
    });
  }
}
