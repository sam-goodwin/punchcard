import { Shape } from '@punchcard/shape';
import { Do2C } from 'fp-ts-contrib/lib/Do';
import { VBool } from '../types/bool';
import { VObject } from '../types/object';
import { $util } from '../util/util';
import { set, Statement, StatementF } from './statement';

// see: https://github.com/gcanti/fp-ts-contrib/blob/master/test/Free.ts

export interface ResolverScope {
  [lexicalName: string]: VObject;
}
/**
 * Builder for constructing a ResolverPipeline
 *
 * @see https://docs.aws.amazon.com/appsync/latest/devguide/pipeline-resolvers.html
 */
export class Resolver<L extends ResolverScope, Ret extends Shape> {
  constructor(public readonly _do: Do2C<'Free', L, Statement.URI>) {}

  public doL<B extends VObject>(
    f: (scope: L) => StatementF<B>
  ): Resolver<L, Ret> {
    return new Resolver(this._do.doL(f));
  }
  public run = this.doL;

  public bindL<ID extends string, B extends VObject>(
    id: Exclude<ID, keyof L>,
    f: (scope: L) => StatementF<B>
  ): Resolver<L & {
    [id in ID]: B;
  }, Ret> {
    return new Resolver(this._do.bindL(id, f));
  }
  public resolve = this.bindL;

  public let<ID extends string, B extends VObject>(
    id: Exclude<ID, keyof L>,
    f: (scope: L) => B
  ): Resolver<L & {
    [id in ID]: B;
  }, Ret> {
    return this.bindL(id, scope => set(f(scope), id));
  }

  public validate(f: (scope: L) => VBool, message: string) {
    return this.doL(scope => $util.validate(f(scope), message));
  }

  public return(f: (scope: L) => VObject.Like<Ret>): Resolved<Ret>;
  public return<K extends keyof L>(value: K): Resolved<Ret extends VObject.ShapeOf<L[K]> ? Ret : never>;
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

  constructor(public readonly program: StatementF<VObject.Like<T>>) {}
}
