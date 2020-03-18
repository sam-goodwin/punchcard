import { RecordMembers, Shape } from '@punchcard/shape';
import { Do, Do2C } from 'fp-ts-contrib/lib/Do';
import { GraphQL } from '../types';
import { Statement, StatementF } from './statement';

// see: https://github.com/gcanti/fp-ts-contrib/blob/master/test/Free.ts

export interface ResolverScope {
  [lexicalName: string]: GraphQL.Type;
}
/**
 * Builder for constructing a ResolverPipeline
 */
export class Resolver<L extends ResolverScope, Ret extends Shape> {
  constructor(public readonly _do: Do2C<'Free', L, Statement.URI>) {}

  public map<ID extends string, B extends GraphQL.Type>(
    id: ID,
    f: (scope: L) => StatementF<B>
  ): Resolver<L & {
    [id in ID]: B;
  }, Ret>;

  public map<B extends GraphQL.Type>(
    f: (scope: L) => StatementF<B>
  ): Resolver<L, Ret>;

  public map(a: any, b?: any): any {
    if (typeof a === 'string') {
      return new Resolver(this._do.bindL(a as any, b as any));
    } else {
      return new Resolver(this._do.do(b as any));
    }
  }

  public readonly $ = this.map;

  public return(f: (scope: L) => GraphQL.Repr<Ret> | StatementF<GraphQL.Repr<Ret>>): Resolved<Ret> {
    const ret = this._do.return(f);

    return new Resolved(ret);
  }
}

export class Resolved<T extends Shape> {
  public readonly _tag: 'resolved' = 'resolved';

  constructor(program: GraphQL.Repr<T> | StatementF<GraphQL.Repr<T>>) {}
}

export function $function<Args extends RecordMembers, Ret extends Shape.Like>(args: Args, returns: Ret): Resolver<{
  [a in keyof Args]: GraphQL.TypeOf<Shape.Resolve<Args[a]>>;
}, Shape.Resolve<Ret>> {
  throw new Error();
}
export const $fn = $function;
export const $resolver = $function;
