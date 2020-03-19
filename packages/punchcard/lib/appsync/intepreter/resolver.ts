import { RecordMembers, Shape } from '@punchcard/shape';
import { Do, Do2C } from 'fp-ts-contrib/lib/Do';
import { free } from 'fp-ts-contrib/lib/Free';
import { GraphQL } from '../graphql';
import { Statement, StatementF, Statements } from './statement';

// see: https://github.com/gcanti/fp-ts-contrib/blob/master/test/Free.ts

export interface ResolverScope {
  [lexicalName: string]: GraphQL.Type;
}
/**
 * Builder for constructing a ResolverPipeline
 *
 * @see https://docs.aws.amazon.com/appsync/latest/devguide/pipeline-resolvers.html
 */
export class Resolver<L extends ResolverScope, Ret extends Shape> {
  constructor(public readonly _do: Do2C<'Free', L, Statement.URI>) {}

  public doL<B extends GraphQL.Type>(
    f: (scope: L) => StatementF<B>
  ): Resolver<L, Ret> {
    return new Resolver(this._do.doL(f));
  }
  public run = this.doL;

  public bindL<ID extends string, B extends GraphQL.Type>(
    id: Exclude<ID, keyof L>,
    f: (scope: L) => StatementF<B>
  ): Resolver<L & {
    [id in ID]: B;
  }, Ret> {
    return new Resolver(this._do.bindL(id, f));
  }
  public resolve = this.bindL;

  public stash<ID extends string, B extends GraphQL.Type>(
    id: Exclude<ID, keyof L>,
    f: (scope: L) => B
  ): Resolver<L & {
    [id in ID]: B;
  }, Ret> {
    return this.bindL(id, scope => Statements.stash(f(scope), id));
  }
  public let = this.stash;

  public validate(f: (scope: L) => GraphQL.Bool, message: string) {
    return this.doL(scope => GraphQL.$util.validate(f(scope), message));
  }

  public return(f: (scope: L) => GraphQL.Repr<Ret>): Resolved<Ret>;
  public return<K extends keyof L>(value: K): Resolved<Ret extends GraphQL.ShapeOf<L[K]> ? Ret : never>;
  public return(f: any): any {
    if (typeof f === 'string') {
      return new Resolved(this._do.return(scope => scope[f]));
    } else {
      return new Resolved(this._do.return(f) as any);
    }
  }
}

export class Resolved<T extends Shape> {
  public readonly _tag: 'resolved' = 'resolved';

  constructor(public readonly program: StatementF<GraphQL.Repr<T>>) {}
}

export function $api<Args extends RecordMembers, Ret extends Shape.Like>(args: Args, returns: Ret): Resolver<{
  [a in keyof Args]: GraphQL.TypeOf<Shape.Resolve<Args[a]>>;
}, Shape.Resolve<Ret>> {
  let f: any = Do(free);
  Object.entries(args).forEach(([name, type]) => {
    f = f.letL(name, () => GraphQL.of(Shape.resolve(type), new GraphQL.Expression(`$context.arguments.${name}`)));
  });
  return new Resolver(f);
}
