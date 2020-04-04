import { number as numberShape, string as stringShape } from '@punchcard/shape';
import { Shape } from '@punchcard/shape/lib/shape';
import { VExpression } from './expression';
import { set, Statement } from './statement';
import { VFloat, Visitor, VObject, VString } from './vtl-object';

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
export type ExpressionTemplate<T extends Shape> = <Args extends (VObject)[]>(template: TemplateStringsArray,...args: Args) => VTL<VObject.Of<T>>;

/**
 * Evaluate a VTL template as an instance of some shape.
 *
 * The VTL expression must be valid on the RHS of a #set operation.
 *
 * ```ts
 * const str = vtl(string)`hello`;
 * ```
 *
 * Translates to:
 * ```
 * #set($var1 = "hello")
 * ```
 *
 * @param type what type to treat the assigned variable
 */
export function vtl<T extends Shape>(type: T): ExpressionTemplate<T> {
  return function*(template, ...args) {
    return yield* set(VObject.of(type,  VExpression.concat(...template.map((str, i) => new VExpression(() =>
      `${str}${i < args.length ? VObject.exprOf(args[i]).visit() : ''}`
    )))));
  };
}

export namespace VTL {
  export function *string(s: string): VTL<VString> {
    return yield* set(VObject.of(stringShape, new VExpression(`"${s}"`)));
  }

  export function *number(n: number): VTL<VFloat> {
    return yield* set(VObject.of(numberShape, new VExpression(n.toString(10))));
  }
}