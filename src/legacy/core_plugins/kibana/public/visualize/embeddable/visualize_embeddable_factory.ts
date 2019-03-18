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
import chrome from 'ui/chrome';
import { EmbeddableFactory } from 'ui/embeddable';
import { getVisualizeLoader } from 'ui/visualize/loader';
import { VisualizeEmbeddable, VisualizeInput, VisualizeOutput } from './visualize_embeddable';

import { Legacy } from 'kibana';
import { EmbeddableInstanceConfiguration, OnEmbeddableStateChanged } from 'ui/embeddable';
import { ErrorEmbeddable } from 'ui/embeddable/embeddables/error_embeddable';
import { VisTypesRegistry } from 'ui/registry/vis_types';
import { VisualizationAttributes } from '../../../../../server/saved_objects/service/saved_objects_client';
import { SavedVisualizations } from '../types';
import { DisabledLabEmbeddable } from './disabled_lab_embeddable';
import { getIndexPattern } from './get_index_pattern';
export const VISUALIZE_EMBEDDABLE_TYPE = 'visualization';

export class VisualizeEmbeddableFactory extends EmbeddableFactory<VisualizationAttributes> {
  private savedVisualizations: SavedVisualizations;
  private config: Legacy.KibanaConfig;

  constructor(
    savedVisualizations: SavedVisualizations,
    config: Legacy.KibanaConfig,
    visTypes: VisTypesRegistry
  ) {
    super({
      name: VISUALIZE_EMBEDDABLE_TYPE,
      savedObjectMetaData: {
        name: i18n.translate('kbn.visualize.savedObjectName', { defaultMessage: 'Visualization' }),
        type: 'visualization',
        getIconForSavedObject: savedObject => {
          return (
            visTypes.byName[JSON.parse(savedObject.attributes.visState).type].icon || 'visualizeApp'
          );
        },
        getTooltipForSavedObject: savedObject => {
          const visType = visTypes.byName[JSON.parse(savedObject.attributes.visState).type].title;
          return `${savedObject.attributes.title} (${visType})`;
        },
        showSavedObject: savedObject => {
          if (chrome.getUiSettingsClient().get('visualize:enableLabs')) {
            return true;
          }
          const typeName: string = JSON.parse(savedObject.attributes.visState).type;
          const visType = visTypes.byName[typeName];
          return visType.stage !== 'experimental';
        },
      },
    });
    this.config = config;
    this.savedVisualizations = savedVisualizations;
  }

  public getEditPath(panelId: string) {
    return this.savedVisualizations.urlFor(panelId);
  }

  public getOutputSpec() {
    return {
      ['title']: {
        displayName: 'Title',
        description: 'The title of the element',
        accessPath: 'title',
        id: 'title',
      },
      ['timeRange']: {
        displayName: 'Time range',
        description: 'The time range. Object type that has from and to nested properties.',
        accessPath: 'timeRange',
        id: 'timeRange',
      },
      ['filters']: {
        displayName: 'Filters',
        description: 'The filters applied to the current view',
        accessPath: 'filters',
        id: 'filters',
      },
      ['query']: {
        displayName: 'Query',
        description: 'The query applied to the current view',
        accessPath: 'query',
        id: 'query',
      },
      ['brushContext']: {
        displayName: 'Brushed time range',
        description:
          'If the end user brushes on a visualization with time as x axis, this will contain the range',
        accessPath: 'actionContext.brushContext',
        id: 'brushContext',
      },
      ['clickContext']: {
        displayName: 'Clicked filter',
        description: 'A filter that was clicked on',
        accessPath: 'actionContext.clickContext',
        id: 'clickContext',
      },
    };
  }

  /**
   *
   * @param panelMetadata. Currently just passing in panelState but it's more than we need, so we should
   * decouple this to only include data given to us from the embeddable when it's added to the dashboard. Generally
   * will be just the object id, but could be anything depending on the plugin.
   * @param onEmbeddableStateChanged
   * @return
   */
  public async create(
    { id, savedObjectId }: EmbeddableInstanceConfiguration,
    initialInput: VisualizeInput
  ) {
    if (!savedObjectId) {
      return new ErrorEmbeddable('No saved object id provided');
    }

    const visId = savedObjectId;

    const editUrl = this.getEditPath(visId);
    const loader = await getVisualizeLoader();
    const savedObject = await this.savedVisualizations.get(visId);
    const isLabsEnabled = this.config.get<boolean>('visualize:enableLabs');

    if (!isLabsEnabled && savedObject.vis.type.stage === 'experimental') {
      return new DisabledLabEmbeddable(savedObject.title, initialInput);
    }

    const indexPattern = await getIndexPattern(savedObject);
    const indexPatterns = indexPattern ? [indexPattern] : [];
    return new VisualizeEmbeddable(
      {
        savedVisualization: savedObject,
        editUrl,
        loader,
        factory: this,
        indexPatterns,
        id,
      },
      initialInput
    );
  }
}
