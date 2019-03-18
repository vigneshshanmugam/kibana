/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EmbeddableFactoriesRegistryProvider } from 'ui/embeddable';
import { MapEmbeddableFactory } from './map_embeddable_factory';
import '../angular/services/gis_map_saved_object_loader';
import 'ui/vis/map/service_settings';

function mapEmbeddableFactoryProvider(gisMapSavedObjectLoader) {
  return new MapEmbeddableFactory(gisMapSavedObjectLoader);
}

EmbeddableFactoriesRegistryProvider.register(mapEmbeddableFactoryProvider);
