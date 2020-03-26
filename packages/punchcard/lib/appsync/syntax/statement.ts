import { Shape } from '@punchcard/shape/lib/shape';
import { Free, liftF } from 'fp-ts-contrib/lib/Free';
import { Build } from '../../core/build';
import { VObject } from '../types/object';

declare module 'fp-ts/lib/HKT' {
  interface URItoKind<A> {
    [Statement.URI]: Statement<A>
  }
}

/**
 * A Statement is a piece of logic executed by AppSync with Velocity Templates.
 *
 * A series of Statements will be interpreted to generate a linear AppSync Resolver Pipeline.
 *
 * @see https://docs.aws.amazon.com/appsync/latest/devguide/pipeline-resolvers.html
 */
export type Statement<A = any> =
  | Statements.Call<A>
  | Statements.Set<A>
  ;

export namespace Statement {
  export const URI = 'Statement';
  export type URI = typeof URI;
}

/**
 * A Free
 */
export type StatementF<A extends VObject = VObject> = Free<Statement.URI, A>;

export function call<T extends Shape, U extends VObject>(
  resolverFunction: Build<any>,
  request: VObject.Of<T>,
  response: U
): StatementF<U> {
  return liftF(new Statements.Call(resolverFunction, request, response));
}

export function set<T extends VObject>(value: T, id?: string): StatementF<T> {
  return liftF(new Statements.Set(value, id));
}

export namespace Statements {
  /**
   * Call a data source with a request and receive a response.
   */
  export class Call<T = VObject> {
    _URI: Statement.URI;
    _tag: 'call' = 'call';
    _A: T;
    constructor(
      public readonly resolverFunction: Build<any>,
      public readonly request: VObject,
      public readonly response: T,
      ) {}
  }

  /**
   * Print to the output of the current VTL template.
   */
  export class Print<T = VObject> {
    _URI: Statement.URI;
    _tag: 'print' = 'print';
    _A: T;
    constructor(
      public readonly value: T) {}
  }

  /**
   * Stash a value for use later.
   */
  export class Set<T = VObject> {
    _URI: Statement.URI;
    _tag: 'set' = 'set';
    _A: T;

    constructor(
      public readonly value: T,
      public readonly id?: string) {}
  }
}

export namespace StatementGuards {
  export function isCall(a: any): a is Statements.Call<VObject> {
    return a._tag === 'call';
  }

  export function isSet(a: any): a is Statements.Set<VObject> {
    return a._tag === 'stash';
  }
}
