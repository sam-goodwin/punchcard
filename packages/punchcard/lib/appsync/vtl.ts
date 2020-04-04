import { number as numberShape, string as stringShape } from '@punchcard/shape';
import { Shape } from '@punchcard/shape/lib/shape';
import { VExpression } from './expression';
import { set, Statement } from './statement';
import { Visitor, VNumber, VObject, VString } from './vtl-object';

/**
 * Represents a Velocity Template program.
 */
export type VTL<T> = Generator<Statement<VObject | void>, T>;

declare module './vtl-object' {
  namespace VObject {
    export function of<T extends Shape>(type: T, expr: VExpression): VObject.Of<T>;
    export function clone<T extends VObject>(t: T, expr: VExpression): T;
  }
}
VObject.of = function of<T extends Shape>(type: T, expr: VExpression): VObject.Of<T> {
  return type.visit(Visitor.defaultInstance as any, expr) as any;
};
VObject.clone = function clone<T extends VObject>(t: T, expr: VExpression): T {
  return VObject.of(VObject.typeOf(t), expr) as any;
};

/**
 * Type of an ExpressionTemplate factory.
 *
 * ```ts
 * GraphQL.string`${mustBeAGraphQLType}`;
 * ```
 */
export type ExpressionTemplate<T extends Shape> = <Args extends (VObject)[]>(template: TemplateStringsArray,...args: Args) => VObject.Of<T>;

export namespace VTL {
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
      return VObject.of(type,  VExpression.concat(...template.map((str, i) => new VExpression(() =>
        `${str}${i < args.length ? VObject.exprOf(args[i]).visit() : ''}`
      ))));
    };
  }

  export function string<Args extends VObject[]>(template: TemplateStringsArray,...args: Args): VTL<VString>;
  export function string(s: string): VTL<VString>;
  export function *string(...args: any[]): VTL<VString> {
    if (typeof args[0] === 'string') {
      return yield* set(VObject.of(stringShape, new VExpression(`"${args[0]}"`)));
    } else {
      return yield* set((VTL.typed(stringShape) as any)(...args));
    }
  }

  export function number<Args extends (VObject)[]>(template: TemplateStringsArray,...args: Args): VNumber;
  export function number(n: number): VNumber;
  export function number(...args: any[]): VNumber {
    if (typeof args[0] === 'number') {
      return VObject.of(numberShape, new VExpression(args[0].toString(10)));
    } else {
      return (VTL.typed(numberShape) as any)(...args);
    }
  }
}