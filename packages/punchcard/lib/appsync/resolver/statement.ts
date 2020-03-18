import { GraphQL } from '../types';
import { Directive } from './directive';
import { InvokeLambda } from './lambda';

import { Free } from 'fp-ts-contrib/lib/Free';

declare module 'fp-ts/lib/HKT' {
  interface URItoKind<A extends GraphQL.Type> {
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
export type Statement<A extends GraphQL.Type> =
  | Directive<A>
  | InvokeLambda<A>
  ;

export namespace Statement {
  export const URI = 'Statement';
  export type URI = typeof URI;
}

/**
 * A Free
 */
export type StatementF<A extends GraphQL.Type> = Free<Statement.URI, A>;