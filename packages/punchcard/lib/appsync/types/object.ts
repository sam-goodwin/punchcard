// tslint:disable: ban-types

import { ArrayShape, BoolShape, DynamicShape, IntegerShape, MapShape, number as numberShape, NumberShape, Pointer, RecordShape, Shape, string as stringShape, StringShape } from '@punchcard/shape';
import { Expression, VolatileExpression } from '../expression/expression';
import { VAny } from './any';
import { VBool } from './bool';
import { VList } from './list';
import { VMap } from './map';
import { VInteger, VNumber } from './numeric';
import { VRecord } from './record';
import { VString } from './string';
import { Visitor } from './visitor';

// export const Shape = Symbol.for('GraphQL.Shape');
export const type = Symbol.for('GraphQL.Type');
export const expr = Symbol.for('GraphQL.Expression');

export class VObject<T extends Shape = Shape> {
  public readonly [type]: T;
  public readonly [expr]: Expression;
  constructor(_type: T, _expr: Expression) {
    this[type] = _type;
    this[expr] = _expr;
  }
}

export namespace VObject {
  const visitor = new Visitor();

  export function isObject(a: any): a is VObject {
    return a[expr] !== undefined;
  }

  export function of<T extends Shape>(type: T, expr: Expression): Of<T> {
    return type.visit(visitor as any, expr) as any;
  }

  export function clone<T extends VObject>(t: T, expr: Expression): T {
    return of(t[type], expr) as any;
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
  export type Like<T extends Shape> = (
    T extends ArrayShape<infer I> ? VObject.Of<T> | Like<I>[] :
    T extends MapShape<infer I> ? VObject.Of<T> | {
      [key: string]: Like<I>;
    } :
    T extends RecordShape<infer M> ? VObject.Of<T> | {
      [m in keyof M]: Like<Shape.Resolve<Pointer.Resolve<M[m]>>>;
    } :
    VObject.Of<T>
  );
}

export namespace VObject {
  /**
   * Type of an ExpressionTemplate factory.
   *
   * ```ts
   * GraphQL.string`${mustBeAGraphQLType}`;
   * ```
   */
  export type ExpressionTemplate<T extends Shape> = <Args extends (VObject)[]>(template: TemplateStringsArray,...args: Args) => VObject.Of<T>;

  export const $ = template;

  /**
   * Evaluate a string template as a shape.
   *
   * ```ts
   * const str = GraphQL.template(string)`hello`;
   *
   * // short-hand
   * const str = GraphQL.$(string)`hello`;
   * ```
   *
   * @param type
   */
  export function template<T extends Shape>(type: Shape): ExpressionTemplate<T> {
    return (template, ...args) => {
      return VObject.of(type, new Expression(frame => {
        // return null as any;
        template.forEach((str, i) => {
          frame.print(str);
          if (i < args.length) {
            frame.interpret(args[i]);
          }
        });
      })) as VObject.Of<T>;
    };
  }

  export function string<Args extends (VObject)[]>(template: TemplateStringsArray,...args: Args): VString;
  export function string(s: string): VString;
  export function string(...args: any[]): VString {
    if (typeof args[0] === 'string') {
      return new VString(stringShape, new VolatileExpression(stringShape, args[0]));
    } else {
      return ($(stringShape) as any)(...args);
    }
  }

  export function number<Args extends (VObject)[]>(template: TemplateStringsArray,...args: Args): VNumber;
  export function number(n: number): VNumber;
  export function number(...args: any[]): VNumber {
    if (typeof args[0] === 'number') {
      return new VNumber(numberShape, new VolatileExpression(numberShape, args[0].toString(10)));
    } else {
      return ($(stringShape) as any)(...args);
    }
  }
}