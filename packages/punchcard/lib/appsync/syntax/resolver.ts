import { Pointer, RecordMembers, Shape } from '@punchcard/shape';
import { Do, Do2C } from 'fp-ts-contrib/lib/Do';
import { free } from 'fp-ts-contrib/lib/Free';
import { VBool } from '../types/bool';
import { VObject } from '../types/object';
import { VTL } from '../types/vtl';
import { $util } from '../util/util';
import { VExpression } from './expression';
import { set, Statement, StatementF } from './statement';

// see: https://github.com/gcanti/fp-ts-contrib/blob/master/test/Free.ts

// export enum ResolverType {
//   Field,
//   Function,
//   Subscription
// }

export interface ResolverScope {
  [lexicalName: string]: VObject;
}

// export const $ = Resolver.new;
export function $function<
  Args extends RecordMembers,
  Ret extends Shape
>(
  args: Args,
  returns: Pointer<Ret>
): Resolver<Args, Ret, {
  // make all the arguments available in lexical scope
  [a in keyof Args]: VObject.Of<Pointer.Resolve<Args[a]>>;
}>;
// export function $def<Ret extends Shape.Like>(returns: Ret): Resolver<{}, Ret>;
export function $function(a: any, b?: any) {
  if (b !== undefined) {
    return Resolver.new(a, b);
  } else {
    return Resolver.new({}, a);
  }
}

/**
 * Builder for constructing a ResolverPipeline
 *
 * @see https://docs.aws.amazon.com/appsync/latest/devguide/pipeline-resolvers.html
 */
export class Resolver<Args extends RecordMembers = {}, Ret extends Shape = Shape, L extends ResolverScope = {}> {
  public static new<Args extends RecordMembers, Ret extends Shape>(
    args: Args,
    returns: Ret
  ): Resolver<Args, Ret, {
    [a in keyof Args]: VObject.Of<Pointer.Resolve<Args[a]>>;
  }> {
    let d: any = Do(free);
    Object.entries(args).forEach(([name, type]) => {
      d = d.letL(name, () => VTL.of(
        Pointer.resolve(type),
        new VExpression(`$context.arguments.${name}`))
      );
    });
    return new Resolver(args, returns, d);
  }

  constructor(
    public readonly args: Args,
    public readonly returns: Ret,
    public readonly _do: Do2C<'Free', L, Statement.URI>) {}

  public doL<B extends VObject>(
    f: (scope: L) => StatementF<B>
  ): Resolver<Args, Ret, L> {
    return new Resolver(this.args, this.returns, this._do.doL(f));
  }
  public run = this.doL;

  public bindL<ID extends string, B extends VObject>(
    id: Exclude<ID, keyof L>,
    f: (scope: L) => StatementF<B>
  ): Resolver<Args, Ret, L & {
    [id in ID]: B;
  }> {
    return new Resolver(this.args, this.returns, this._do.bindL(id, f));
  }
  public call = this.bindL;

  public let<ID extends string, B extends VObject>(
    id: Exclude<ID, keyof L>,
    f: (scope: L) => B
  ): Resolver<Args, Ret, L & {
    [id in ID]: B;
  }> {
    return this.bindL(id, scope => set(f(scope), id));
  }

  public validate(f: (scope: L) => VBool, message: string) {
    return this.doL(scope => $util.validateF(f(scope), message));
  }

  public return(f: (scope: L) => VObject.Of<Ret>): ResolverImpl<Args, Ret>;
  public return<K extends keyof L>(value: K): ResolverImpl<Args, Ret>;
  public return(f: any): any {
    if (typeof f === 'string') {
      return new ResolverImpl(this.args, this.returns, this._do.return(scope => scope[f]));
    } else {
      return new ResolverImpl(this.args, this.returns, this._do.return(f));
    }
  }
}

/**
 * Implementation of a Resolver.
 *
 * @typeparam Args named arguments to the resolver
 * @typeparam Returns type returned by the resolver
 */
export class ResolverImpl<Args extends RecordMembers, Returns extends Shape> {
  public static isResolved(a: any): a is ResolverImpl<{}, Shape> {
    return a._tag === 'resolved';
  }

  public readonly _tag: 'resolved' = 'resolved';

  constructor(
    public readonly args: Args,
    public readonly returns: Returns,
    public readonly program: StatementF<VObject.Of<Returns>>) {}
}
