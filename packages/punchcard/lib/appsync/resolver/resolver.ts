import { RecordType, RecordShape, Shape } from '@punchcard/shape';
import { Do, Do2C } from 'fp-ts-contrib/lib/Do';
import { Free, free } from 'fp-ts-contrib/lib/Free';
import { GraphQL } from '../types';
import { Directive } from './directive';
import { InvokeLambda } from "./lambda";

// see: https://github.com/gcanti/fp-ts-contrib/blob/master/test/Free.ts

export const URI = 'ResolverStatement';
export type URI = typeof URI;

declare module 'fp-ts/lib/HKT' {
  interface URItoKind<A extends GraphQL.Type> {
    [URI]: ResolverStatement<A>
  }
}

export type ResolverStatement<A extends GraphQL.Type> =
  | Directive<A>
  | InvokeLambda<A>
  ;

export type ResolverStatementF<A extends GraphQL.Type> = Free<URI, A>;

export interface ResolverScope {
  [lexicalName: string]: GraphQL.Type;
}

export type FieldResolver<T extends RecordType, Ret extends Shape> = (resolver: Resolver<{ root: GraphQL.TypeOf<T>; }, Ret>) => Resolved<Ret>;

export function fieldResolver<T extends RecordShape<any>, Ret extends Shape>(type: T, returns: Ret): Resolver<{ root: GraphQL.TypeOf<T>; }, Ret> {
  throw new Error('todo');
}

/**
 * Builder for constructing a ResolverPipeline
 */
export class Resolver<L extends ResolverScope, Ret extends Shape> {
  constructor(public readonly _do: Do2C<'Free', L, URI>) {}

  public map<ID extends string, B extends GraphQL.Type>(
    id: ID,
    f: (scope: L) => ResolverStatementF<B>
  ): Resolver<L & {
    [id in ID]: B;
  }, Ret>;

  public map<B extends GraphQL.Type>(
    f: (scope: L) => ResolverStatementF<B>
  ): Resolver<L, Ret>;

  public map(a: any, b?: any): any {
    if (typeof a === 'string') {
      return new Resolver(this._do.bindL(a as any, b as any));
    } else {
      return new Resolver(this._do.do(b as any));
    }
  }

  public return(f: (scope: L) => GraphQL.Repr<Ret> | ResolverStatementF<GraphQL.Repr<Ret>>): Resolved<Ret> {
    return new Resolved(this._do.return(f));
  }
}

export class Resolved<T extends Shape> {
  public readonly _tag: 'resolved' = 'resolved';

  constructor(program: Free<'Resolver', T>) {}
}

