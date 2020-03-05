import { RecordType, Value } from '@punchcard/shape';
import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Client, Clients } from '../core/client';
import { Dependency } from '../core/dependency';
import * as Lambda from '../lambda';
import { Collector } from './collector';
import { Cons } from './hlist';

import type * as lambda from '@aws-cdk/aws-lambda';
import type * as cdk from '@aws-cdk/core';

export type EventType<E extends Stream<any, any, any, any>> = E extends Stream<infer E, any, any, any> ? E : never;
export type DataType<E extends Stream<any, any, any, any>> = E extends Stream<any, infer I, any, any> ? I : never;
export type DependencyType<E extends Stream<any, any, any, any>> = E extends Stream<any, any, infer D, any> ? D : never;

/**
 * Represents chainable async operations on a cloud data structure.
 *
 * @typeparam E type of event that triggers the computation, i.e. SQSEvent to a Lambda Function
 * @typeparam T type of data yielded from this source (after transformation)
 * @typeparam D runtime dependencies
 * @typeparam C runtime configuration
 */
export abstract class Stream<E extends RecordType, T, D extends any[], C> {
  constructor(
      protected readonly previous: Stream<E, any, any, C>,
      protected readonly f: (value: AsyncIterableIterator<any>, clients: Clients<D>) => AsyncIterableIterator<T>,
      public readonly dependencies: D) {
    // do nothing
  }

  /**
   * Create an event source to attach to the function.
   *
   * @param props optional properties - must implement sensible defaults
   */
  public abstract eventSource(props?: C): Build<lambda.IEventSource>;

  /**
   * Describe a transformation of values.
   *
   * **Warning**: the transformation in a map only runs when terminated, i.e. it is
   * lazily evaluated, so you must call `forEach`, `forBatch` or `collect`.
   *
   * @param f transformation function
   */
  public map<U>(handle: (value: T) => Promise<U>): Stream<E, U, D, C>;
  public map<U, D2 extends Dependency<any> | undefined>(
      input: {
        depends?: D2;
      },
      handle: (value: T, deps: Client<D2>) => Promise<U>): Stream<E, U, D2 extends undefined ? D : Cons<D, D2>, C>;
  public map(inputOrHandle: any, handle?: any): any {
    if (typeof inputOrHandle === 'function') {
      return this.flatMap({}, async (v, c) => [await handle(v, c)]);
    } else {
      return this.flatMap({ depends: inputOrHandle.depends }, async (v, c) => [await handle(v, c)]);
    }
  }

  /**
   * Describe a mapping of one value to (potentially) many.
   *
   * **Warning**: the transformation in a map only runs when terminated, i.e. it is
   * lazily evaluated, so you must call `forEach`, `forBatch` or `collect`.
   *
   * @param f transformation function
   */
  public flatMap<U, D2 extends Dependency<any> | undefined>(
      input: { depends?: D2; },
      handle: (value: T, deps: Client<D2>) => Promise<Iterable<U>>): Stream<E, U, D2 extends undefined ? D : Cons<D, D2>, C> {
    return this.chain({
      depends: (input.depends === undefined ? this.dependencies : [input.depends].concat(this.dependencies)) as any,
      handle: (async function*(values: AsyncIterableIterator<T>, clients: any) {
        for await (const value of values) {
          for (const mapped of await handle(value, clients)) {
            yield mapped;
          }
        }
      })
    });
  }

  /**
   * Chain another async generator, flattening results into a single stream.
   *
   * Also, add to the dependencies.
   *
   * @param f chain function which iterates values and yields results.
   * @param dependencies
   */
  public abstract chain<U, D2 extends any[]>(input: {
    depends: D2;
    handle: (value: AsyncIterableIterator<T>, deps: Clients<D2>) => AsyncIterableIterator<U>
  }): Stream<E, U, D2, C>;

  /**
   * Asynchronously process an event and yield values.
   *
   * @param event payload
   * @param clients bootstrapped clients
   */
  public run(event: Value.Of<E>, deps: Clients<D>): AsyncIterableIterator<T> {
    if (this.dependencies === this.previous.dependencies) {
      return this.f(this.previous.run(event, deps), deps ? (deps as any[])[0] : undefined);
    } else {
      // pass the tail of dependencies to the previous if its dependencies are different
      // note: we are assuming that 'different' means the tail, otherwise it's a call
      // which which doesn't add dependencies, like batch
      return this.f(this.previous.run(event, deps ? deps.slice(1) : [] as any), deps ? (deps as any[])[0] : undefined);
    }
  }

  /**
   * Enumerate each value.
   *
   * @param scope under which this construct should be created
   * @param id of the construct
   * @param f next transformation of a record
   * @param props optional props for configuring the function consuming from SQS
   */
  public forEach<D2 extends Dependency<any> | undefined>(
      scope: Build<cdk.Construct>, id: string,
      input: {
        depends?: D2;
        config?: Build<C>;
        executorService?: Lambda.ExecutorService;
      },
      handle: (value: T, deps: Client<D2>) => Promise<any>): Lambda.Function<E, any, D2 extends undefined ? Dependency.Concat<D> : Dependency.Concat<Cons<D, D2>>> {
    // TODO: let the stream type determine default executor service
    const executorService = (input.config && input.executorService) || new Lambda.ExecutorService(Build.lazy(() => ({
      timeout: CDK.Core.Duration.seconds(10)
    })));
    const l = executorService.spawn(scope, id, {
      depends: input.depends === undefined
        ? Dependency.concat(...this.dependencies)
        : Dependency.concat(input.depends, ...this.dependencies),
    }, async (event: Value.Of<E>, deps) => {
      if (input.depends === undefined) {
        for await (const value of this.run(event, deps as any)) {
          await handle(value, undefined as any);
        }
      } else {
        for await (const value of this.run(event, (deps as any[]).slice(1) as Clients<D>)) {
          await handle(value, deps[0] as Client<D2>);
        }
      }
    });
    l.resource.chain(l =>
      ((input.config || Build.of(undefined)) as Build<C | undefined>).chain(config =>
        this.eventSource(config).map(es =>
          l.addEventSource(es))));
    return l as any;
  }

  /**
   * Buffer results and process them as a batch.
   *
   * @param scope under which this construct should be created
   * @param id of the construct
   * @param f function to process batch of results
   * @param props optional props for configuring the function consuming from SQS
   */
  public forBatch<D2 extends Dependency<any> | undefined>(
    scope: Build<cdk.Construct>, id: string,
    input: {
      depends?: D2;
      config?: Build<C>;
      executorService?: Lambda.ExecutorService;
    },
    handle: (value: T[], deps: Client<D2>) => Promise<any>): Lambda.Function<E, any, D2 extends undefined ? Dependency.Concat<D> : Dependency.Concat<Cons<D, D2>>> {
    return this.batched().forEach(scope, id, input, handle);
  }

  /**
   * Buffer flowing records into batches.
   *
   * @param size maximum number of records in the batch (defaults to all)
   */
  public batched(size?: number): Stream<E, T[], D, C> {
    return this.chain({
      depends: this.dependencies,
      async *handle(it) {
        let batch = [];
        for await (const value of it) {
          batch.push(value);
          if (size && batch.length === size) {
            yield batch;
            batch = [];
          }
        }
        if (batch.length > 0) {
          yield batch;
        }
        return;
      }
    });
  }

  /**
   * Collect data with a `Collector`.
   *
   * @param scope to create resources under
   * @param id of construct under which forwarding resources will be created
   * @param collector destination collector
   */
  public collect<T>(scope: Build<cdk.Construct>, id: string, collector: Collector<T, this>): T {
    return collector.collect(scope, id, this);
  }
}
