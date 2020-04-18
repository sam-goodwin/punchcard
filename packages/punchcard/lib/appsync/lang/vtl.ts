import { number as numberShape, ShapeGuards, string as stringShape } from '@punchcard/shape';
import { Shape } from '@punchcard/shape/lib/shape';
import { VExpression } from './expression';
import { setVariable, Statement } from './statement';
import { VFloat, Visitor, VObject, VString } from './vtl-object';

/**
 * Represents a Velocity Template program.
 */
export type VTL<T> = Generator<Statement<unknown> | never, T>;
export type ConstrainedVTL<S extends Statement<unknown>, T> = Generator<S, T>;

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
    return yield* setVariable(VObject.of(type,  VExpression.concat(
      quotes(type),
      ...template.map((str, i) => new VExpression(ctx =>
        `${str}${i < args.length ? VObject.exprOf(args[i]).visit(ctx).text : ''}`
      )),
      quotes(type)
    )));
  };
}

function quotes(type: Shape): string {
  return needsQuotes(type) ? '"' : '';
}

function needsQuotes(type: Shape): boolean {
  return ShapeGuards.isStringShape(type) || ShapeGuards.isBinaryShape(type) || ShapeGuards.isTimestampShape(type);
}

export namespace VTL {
  export function *string(s: string): VTL<VString> {
    return yield* setVariable(VObject.of(stringShape, new VExpression(`"${s}"`)));
  }

  export function *number(n: number): VTL<VFloat> {
    return yield* setVariable(VObject.of(numberShape, new VExpression(n.toString(10))));
  }
}
