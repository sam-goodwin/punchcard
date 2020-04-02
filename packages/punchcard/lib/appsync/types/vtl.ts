import { number as numberShape, Shape, string as stringShape } from '@punchcard/shape';

import { Statement, VExpression } from '../syntax';
import { VNumber } from './numeric';
import { expr, type, VObject } from './object';
import { VString } from './string';
import { Visitor } from './visitor';

export type VTL<T> = Generator<Statement<VObject>, T>;

export namespace VTL {
  export function of<T extends Shape>(type: T, expr: VExpression): VObject.Of<T> {
    return type.visit(Visitor.defaultInstance as any, expr) as any;
  }

  export function clone<T extends VObject>(t: T, expr: VExpression): T {
    return of(t[type], expr) as any;
  }

  /**
   * Type of an ExpressionTemplate factory.
   *
   * ```ts
   * GraphQL.string`${mustBeAGraphQLType}`;
   * ```
   */
  export type ExpressionTemplate<T extends Shape> = <Args extends (VObject)[]>(template: TemplateStringsArray,...args: Args) => VObject.Of<T>;

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
  export function typed<T extends Shape>(type: T): ExpressionTemplate<T> {
    return (template, ...args) => {
      return VTL.of(type,  VExpression.concat(...template.map((str, i) => new VExpression(() =>
        `${str}${i < args.length ? args[i][expr].visit() : ''}`
      ))));
    };
  }

  export function string<Args extends (VObject)[]>(template: TemplateStringsArray,...args: Args): VString;
  export function string(s: string): VString;
  export function string(...args: any[]): VString {
    if (typeof args[0] === 'string') {
      return VTL.of(stringShape, new VExpression(`"${args[0]}"`));
    } else {
      return (VTL.typed(stringShape) as any)(...args);
    }
  }

  export function number<Args extends (VObject)[]>(template: TemplateStringsArray,...args: Args): VNumber;
  export function number(n: number): VNumber;
  export function number(...args: any[]): VNumber {
    if (typeof args[0] === 'number') {
      return VTL.of(numberShape, new VExpression(args[0].toString(10)));
    } else {
      return (VTL.typed(numberShape) as any)(...args);
    }
  }
}