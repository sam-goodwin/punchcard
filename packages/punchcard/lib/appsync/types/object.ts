// tslint:disable: ban-types

import { ArrayShape, BoolShape, DynamicShape, IntegerShape, MapShape, NumberShape, Pointer, RecordShape, SetShape, Shape, StringShape } from '@punchcard/shape';
import { VExpression } from '../syntax/expression';
import { VAny } from './any';
import { VBool } from './bool';
import { VList } from './list';
import { VMap } from './map';
import { VInteger, VNumber } from './numeric';
import { VRecord } from './record';
import { VString } from './string';

// export const Shape = Symbol.for('GraphQL.Shape');
export const type = Symbol.for('GraphQL.Type');
export const expr = Symbol.for('GraphQL.Expression');

export class VObject<T extends Shape = Shape> {
  public readonly [type]: T;
  public readonly [expr]: VExpression;
  constructor(_type: T, _expr: VExpression) {
    this[type] = _type;
    this[expr] = _expr;
  }
}

export namespace VObject {
  export function isObject(a: any): a is VObject {
    return a[expr] !== undefined;
  }

  export type ShapeOf<T extends VObject> = T extends VObject<infer I> ? I : never;

  export type Of<T extends Shape.Like> =
    Shape.Resolve<T> extends BoolShape ? VBool :
    Shape.Resolve<T> extends DynamicShape<any> ? VAny :
    Shape.Resolve<T> extends IntegerShape ? VInteger :
    Shape.Resolve<T> extends NumberShape ? VNumber :
    Shape.Resolve<T> extends StringShape ? VString :

    Shape.Resolve<T> extends ArrayShape<infer I> ? VList<VObject.Of<I>> :
    Shape.Resolve<T> extends MapShape<infer I> ? VMap<VObject.Of<I>> :
    Shape.Resolve<T> extends RecordShape<infer M> ? VRecord<{
      [m in keyof M]: Of<Shape.Resolve<Pointer.Resolve<M[m]>>>;
    }> & {
      [m in keyof M]: Of<Shape.Resolve<Pointer.Resolve<M[m]>>>;
    } :
    VObject<Shape.Resolve<T>>
    ;

  /**
   * Object that is "like" a VObject for some Shape.
   *
   * Like meaning that is either an expression, or a collection
   * of expressions that share the structure of the target type.
   */
  export type Like<T extends Shape> = VObject.Of<T> | (
    T extends ArrayShape<infer I> ? Like<I>[] :
    T extends SetShape<infer I> ? Like<I>[] :
    T extends MapShape<infer I> ? {
      [key: string]: Like<I>;
    } :
    T extends RecordShape<infer M> ? {
      [m in keyof M]: Like<Shape.Resolve<Pointer.Resolve<M[m]>>>;
    } :
    VObject.Of<T>
  );
}
