import { Expression, NothingExpression } from './expression';
import { FunctionCall } from './function-call';
import { List } from './list';
import { Literal } from './literal';
import { Object } from './object';
import { Reference } from './reference';
import { NodeType } from './symbols';

export abstract class Node {
  public abstract readonly [NodeType]: string;

}

export namespace Node {
  export interface Visitor<T = any, C = undefined> {
    functionCall<F extends FunctionCall>(f: F): T;
  }

  export namespace Guards {
    function expressionGuard<T>(expressionNodeType: string): (a: any) => a is T {
      return ((a: any) => (isExpression(a) && a[NodeType] === expressionNodeType)) as any;
    }
    export function isExpression(a: any): a is Expression {
      return a[NodeType] === 'expression';
    }
    export const isFunctionCall = expressionGuard<FunctionCall>('functionCall');
    export const isLiteral = expressionGuard<Literal>('literal');
    export const isObject = expressionGuard<Object>('object');
    export const isReference = expressionGuard<Reference>('reference');
  }
}
