import { number as numberShape, Shape, string as stringShape } from '@punchcard/shape';

import { VExpression, VolatileExpression } from '../syntax';
import { VNumber } from './numeric';
import { type, VObject } from './object';
import { VString } from './string';
import { Visitor } from './visitor';

export type VTL<T> = Generator<unknown, T>;

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
      return VTL.of(type, new VExpression(frame => {
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

  // export function object<M extends { [key: string]: VObject; }>(members: M): VRecord<M> {
  //   const shapeMembers: any = {};
  //   for (const [name, value] of Object.entries(members)) {
  //     shapeMembers[name] = value[type];
  //   }
  //   return new VRecord(members);
  // }

  export function string<Args extends (VObject)[]>(template: TemplateStringsArray,...args: Args): VString;
  export function string(s: string): VString;
  export function string(...args: any[]): VString {
    if (typeof args[0] === 'string') {
      return VTL.of(stringShape, new VolatileExpression(stringShape, `"${args[0]}"`));
    } else {
      return (VTL.typed(stringShape) as any)(...args);
    }
  }

  export function number<Args extends (VObject)[]>(template: TemplateStringsArray,...args: Args): VNumber;
  export function number(n: number): VNumber;
  export function number(...args: any[]): VNumber {
    if (typeof args[0] === 'number') {
      return VTL.of(numberShape, new VolatileExpression(numberShape, args[0].toString(10)));
    } else {
      return (VTL.typed(numberShape) as any)(...args);
    }
  }
}