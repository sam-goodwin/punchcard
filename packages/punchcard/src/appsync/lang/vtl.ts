import { number as numberShape, ShapeGuards, string as stringShape } from '@punchcard/shape';
import { Shape } from '@punchcard/shape/lib/shape';
import { VExpression } from './expression';
import { stash, StashProps, Statement, write } from './statement';
import { VFloat, VObject, VString } from './vtl-object';

/**
 * Represents a Velocity Template program.
 */
export type VTL<T, Stmt = Statement<any>> = Generator<Stmt, T>;
export type ConstrainedVTL<S extends Statement<any>, T> = Generator<S, T>;

/**
 * Type of an ExpressionTemplate factory.
 *
 * ```ts
 * GraphQL.string`${mustBeAGraphQLType}`;
 * ```
 */
export type ExpressionTemplate<T extends Shape> = <
  Args extends (VObject | string | number)[]
>(
  template: TemplateStringsArray,
  ...args: Args
) => VTL<VObject.Of<T>>;

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
export function vtl<T extends Shape>(type: T, props?: StashProps): ExpressionTemplate<T>;

export function vtl<Args extends (VObject | string | number)[]>(
  template: TemplateStringsArray,
  ...args: Args
): VTL<void>;

export function vtl(...args: any[]): any {
  if (ShapeGuards.isShape(args[0])) {
    const type: Shape = args[0];
    const props: StashProps | undefined = args[1];
    return function*(template: TemplateStringsArray, ...args: (VObject | string | number)[]) {
      return yield* stash(VObject.fromExpr(type, new VExpression(state => state.write(
        quotes(type),
        ...template
          .map((str, i) => i < args.length ? [str, args[i]] : [str])
          .reduce((a, b) => a.concat(b)),
        quotes(type)
      ))), props);
    };
  } else {
    const template: string[] = args[0];
    args = args.slice(1);
    return (function*() {
      yield* write(new VExpression(state => state.write(
        ...template
          .map((str, i) => i < args.length ? [str, args[i]] : [str])
          .reduce((a, b) => a.concat(b))
      ).writeLine()));
    })();
  }
}

function quotes(type: Shape): string {
  return needsQuotes(type) ? '"' : '';
}

function needsQuotes(type: Shape): boolean {
  return ShapeGuards.isStringShape(type) || ShapeGuards.isBinaryShape(type) || ShapeGuards.isTimestampShape(type);
}

export namespace VTL {
  export function *string(s: string): VTL<VString> {
    return yield* stash(VObject.fromExpr(stringShape, VExpression.text(`"${s}"`)));
  }

  export function *number(n: number): VTL<VFloat> {
    return yield* stash(VObject.fromExpr(numberShape, VExpression.text(n.toString(10))));
  }
}
