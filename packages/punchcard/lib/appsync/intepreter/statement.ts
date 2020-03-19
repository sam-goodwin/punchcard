import { GraphQL } from '../types';

import { Free, liftF } from 'fp-ts-contrib/lib/Free';

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
export type Statement<A = GraphQL.Type> =
  | Statements.Call<A>
  | Statements.Stash<A>
  ;

export namespace Statement {
  export const URI = 'Statement';
  export type URI = typeof URI;
}

/**
 * A Free
 */
export type StatementF<A extends GraphQL.Type = GraphQL.Type> = Free<Statement.URI, A>;

export namespace Statements {
  export function isCall(a: any): a is Call<GraphQL.Type> {
    return a._tag === 'call';
  }

  export class Call<T = GraphQL.Type> {
    _URI: Statement.URI;
    _tag: 'call';
    _A: T;
  }

  export function isStash(a: any): a is Stash<GraphQL.Type> {
    return a._tag === 'stash';
  }

  export function stash<T extends GraphQL.Type>(value: T, id?: string): StatementF<T> {
    return liftF(new Stash(value, id));
  }

  /**
   * Stash a value for use later.
   */
  export class Stash<T = GraphQL.Type> {
    _URI: Statement.URI;
    _tag: 'stash';
    _A: T;

    constructor(public readonly value: T, public readonly id?: string) {}
  }
}
