import { GraphQL } from '../graphql';

import { Shape } from '@punchcard/shape/lib/shape';
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

import type * as appsync from '@aws-cdk/aws-appsync';
import { Build } from '../../core/build';
import { VObject } from '../types/object';

export interface DataSource<T extends Shape, U extends Shape> {
  readonly owner: any;
  readonly input: T;
  readonly output: U;
  dataSource(id: string): Build<appsync.BaseDataSource>;
}

export function call<T extends Shape, U extends VObject>(dataSource: DataSource<T, VObject.ShapeOf<U>>, request: VObject.Like<T>, response: U): StatementF<U> {
  return liftF(new Statements.Call(dataSource , request, response));
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
    _tag: 'call';
    _A: T;
    constructor(
      public readonly dataSource: DataSource<Shape, Shape>,
      public readonly request: VObject,
      public readonly response: T,
      ) {}
  }

  /**
   * Print to the output of the current VTL template.
   */
  export class Print<T = VObject> {
    _URI: Statement.URI;
    _tag: 'print';
    _A: T;
    constructor(
      public readonly value: T) {}
  }

  /**
   * Stash a value for use later.
   */
  export class Set<T = VObject> {
    _URI: Statement.URI;
    _tag: 'set';
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
