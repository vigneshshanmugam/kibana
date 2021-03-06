/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class AbstractStyleProperty {

  constructor(options, styleName) {
    this._options = options;
    this._styleName = styleName;
  }

  isDynamic() {
    return false;
  }

  /**
   * Is the style fully defined and usable? (e.g. for rendering, in legend UX, ...)
   * Why? during editing, partially-completed descriptors may be added to the layer-descriptor
   * e.g. dynamic-fields can have an incomplete state when the field is not yet selected from the drop-down
   * @returns {boolean}
   */
  isComplete() {
    return true;
  }

  getStyleName() {
    return this._styleName;
  }

  getOptions() {
    return this._options || {};
  }

  renderHeader() {
    return null;
  }
}
