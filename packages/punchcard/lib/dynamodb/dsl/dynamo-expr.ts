import { Shape } from '@punchcard/shape';
import { VInteger, VObject, VString } from '../../appsync';
import type { DynamoDSL } from './dynamo-repr';

export type DynamoExpr<T extends Shape = Shape> =
  | DynamoExpr.FunctionCall<T>
  | DynamoExpr.GetListItem<T>
  | DynamoExpr.GetMapItem<T>
  | DynamoExpr.Operator
  | DynamoExpr.Reference<T>
  | DynamoExpr.Scope
;
export namespace DynamoExpr {
  export function isReference(a: any): a is Reference<Shape> {
    return a.tag === Reference.TAG;
  }
  export class Reference<T extends Shape> {
    public static readonly TAG = 'reference';
    public readonly tag = Reference.TAG;
    constructor(
      public readonly target: DynamoDSL.Object<Shape> | undefined,
      public readonly type: T,
      public readonly id: string,
    ) {}
  }
  export function isGetListItem(a: any): a is GetListItem<Shape> {
    return a.tag === GetListItem.TAG;
  }
  export class GetListItem<T extends Shape> {
    public static readonly TAG = 'get-list-item';
    public readonly tag = GetListItem.TAG;
    constructor(
      public readonly list: DynamoDSL.List<T>,
      public readonly index: number | VInteger,
    ) {}
  }
  export function isGetMapItem(a: any): a is GetMapItem<Shape> {
    return a.tag === GetMapItem.TAG;
  }
  export class GetMapItem<T extends Shape> {
    public static readonly TAG = 'get-map-item';
    public readonly tag = GetMapItem.TAG;
    constructor(
      public readonly map: DynamoDSL.Map<T>,
      public readonly key: string | VString,
    ) {}
  }
  export function isFunctionCall(a: any): a is FunctionCall<Shape> {
    return a.tag === FunctionCall.TAG;
  }
  export class FunctionCall<T extends Shape> {
    public static readonly TAG = 'function-call';
    public readonly tag = FunctionCall.TAG;
    constructor(
      public readonly type: T,
      public readonly functionName: string,
      public readonly args: VObject.Like<Shape>[]
    ) {}
  }
  export class Operator {
    public static readonly TAG = 'operator';
    public readonly tag = Operator.TAG;
    constructor(
      // public readonly type: T,
      public readonly lhs: DynamoDSL.Object,
      public readonly operator: string,
      public readonly rhs: DynamoDSL.Object | VObject,
    ) {}
  }
  export class Scope {
    public static readonly TAG = 'scope';
    public readonly tag = Scope.TAG;
    constructor(
      public readonly children: DynamoExpr[]
    ) {}
  }
}