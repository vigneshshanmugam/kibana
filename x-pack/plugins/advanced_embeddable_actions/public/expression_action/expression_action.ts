/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, ActionSavedObject } from 'ui/embeddable/actions';

// @ts-ignore
import { fromExpression } from '@kbn/interpreter/common';
// @ts-ignore
import { interpretAst } from 'plugins/interpreter/interpreter';
import { AnyEmbeddable } from 'ui/embeddable';
import { EXPRESSION_ACTION } from './expression_action_factory';

export class ExpressionAction extends Action<any, any, any> {
  public expression: string;
  constructor(actionSavedObject?: ActionSavedObject) {
    super({
      actionSavedObject,
      type: EXPRESSION_ACTION,
    });
    this.expression = actionSavedObject ? actionSavedObject.attributes.configuration : '';
  }

  public isCompatible() {
    return Promise.resolve(true);
  }

  public updateConfiguration(config: string) {
    this.expression = config;
  }

  public execute({ embeddable }: { embeddable: AnyEmbeddable }) {
    const expressionWithParameters = this.injectTemplateParameters(this.expression, embeddable);
    const ast = fromExpression(expressionWithParameters);
    interpretAst(ast, {});
  }

  public getConfiguration() {
    return this.expression;
  }
}
