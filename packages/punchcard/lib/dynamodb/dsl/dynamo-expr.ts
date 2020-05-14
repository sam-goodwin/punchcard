import { Shape } from '@punchcard/shape';
import { getState, VInteger, VObject, VObjectExpr, VString, vtl } from '../../appsync';
import type { DynamoDSL } from './dynamo-repr';

export type DynamoExpr<T extends Shape = Shape> =
  | DynamoExpr.FunctionCall<T>
  | DynamoExpr.GetListItem<T>
  | DynamoExpr.GetMapItem<T>
  | DynamoExpr.Literal<T>
  | DynamoExpr.Operator
  | DynamoExpr.Reference<T>
  | DynamoExpr.Scope
;
export namespace DynamoExpr {
  export function isExpr(a: any): a is DynamoExpr {
    return isReference(a) ||
      isGetListItem(a) ||
      isGetMapItem(a) ||
      isOperator(a) ||
      isReference(a) ||
      isScope(a) ||
      isLiteral(a)
    ;
  }
  export function isLiteral(a: any): a is Literal<Shape> {
    return a && a.tag === 'literal';
  }
  export class Literal<T extends Shape> {
    public static readonly TAG = 'literal';
    public readonly tag = Literal.TAG;
    constructor(
      public readonly type: T,
      public readonly value: VObject.Like<T>
    ) {}
  }
  export function isReference(a: any): a is Reference<Shape> {
    return a && a.tag === Reference.TAG;
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
    return a && a.tag === GetListItem.TAG;
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
    return a && a.tag === GetMapItem.TAG;
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
    return a && a.tag === FunctionCall.TAG;
  }
  export interface FunctionCallArg<T extends Shape = Shape> {
    type: T;
    value: VObject.Like<T> | DynamoDSL.Object<T>;
  }
  export class FunctionCall<T extends Shape> {
    public static readonly TAG = 'function-call';
    public readonly tag = FunctionCall.TAG;
    constructor(
      public readonly type: T,
      public readonly functionName: string,
      public readonly args: FunctionCallArg[]
    ) {}
  }
  export function isOperator(a: any): a is Operator<Shape> {
    return a && a.tag === Operator.TAG;
  }
  export class Operator<T extends Shape = Shape> {
    public static readonly TAG = 'operator';
    public readonly tag = Operator.TAG;
    constructor(
      public readonly type: T,
      public readonly lhs: DynamoDSL.Object,
      public readonly operator: string,
      public readonly rhs: DynamoDSL.Object<T> | VObject.Like<T>,
    ) {}
  }
  export function isScope(a: any): a is Scope {
    return a && a.tag === Scope.TAG;
  }
  export class Scope {
    public static readonly TAG = 'scope';
    public readonly tag = Scope.TAG;
    constructor(
      public readonly children: DynamoExpr[]
    ) {}
  }
}