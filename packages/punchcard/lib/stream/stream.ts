import lambda = require('@aws-cdk/aws-lambda');
import core = require('@aws-cdk/core');
import { Client, Clients, Dependency, Lambda } from '../compute';
import { Cons } from '../compute/hlist';
import { Collector } from './collector';

export type EventType<E extends Stream<any, any, any, any>> = E extends Stream<infer E, any, any, any> ? E : never;
export type DataType<E extends Stream<any, any, any, any>> = E extends Stream<any, infer I, any, any> ? I : never;
export type DependencyType<E extends Stream<any, any, any, any>> = E extends Stream<any, any, infer D, any> ? D : never;

/**
 * Represents chainable async operations on a cloud data structure.
 *
 * @typeparam E type of event that triggers the computation, i.e. SQSEvent to a Lambda Function
 * @typeparam T type of data yielded from this source (after transformation)
 * @typeparam D runtime dependencies
 * @typeparam R runtime configuration
 */
export abstract class Stream<E, T, D extends any[], C extends Stream.Config> {
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
  public abstract eventSource(props?: C): lambda.IEventSource;

  /**
   * Describe a transformation of values.
   *
   * **Warning**: the transformation in a map only runs when terminated, i.e. it is
   * lazily evaluated, so you must call `forEach`, `forBatch` or `collect`.
   *
   * @param f transformation function
   */
  public map<U, D2 extends Dependency<any> | undefined>(input: {
    depends?: D2;
    handle: (value: T, deps: Client<D2>) => Promise<U>
  }): Stream<E, U, D2 extends undefined ? D : Cons<D, D2>, C> {
    return this.flatMap({
      depends: input.depends,
      handle: async (v, c) => [await input.handle(v, c)]
    });
  }

  /**
   * Describe a mapping of one value to (potentially) many.
   *
   * **Warning**: the transformation in a map only runs when terminated, i.e. it is
   * lazily evaluated, so you must call `forEach`, `forBatch` or `collect`.
   *
   * @param f transformation function
   */
  public flatMap<U, D2 extends Dependency<any> | undefined>(input: {
    depends?: D2;
    handle: (value: T, deps: Client<D2>) => Promise<Iterable<U>>
  }): Stream<E, U, D2 extends undefined ? D : Cons<D, D2>, C> {
    return this.chain({
      depends: (input.depends === undefined ? this.dependencies : [input.depends].concat(this.dependencies)) as any,
      handle: (async function*(values: AsyncIterableIterator<T>, clients: any) {
        for await (const value of values) {
          for (const mapped of await input.handle(value, clients)) {
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
  public run(event: E, deps: Clients<D>): AsyncIterableIterator<T> {
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
  public forEach<D2 extends Dependency<any> | undefined>(scope: core.Construct, id: string, input: {
    depends?: D2;
    handle: (value: T, deps: Client<D2>) => Promise<any>;
    props?: C;
  }): Lambda.Function<E, any, D2 extends undefined ? Dependency.List<D> : Dependency.List<Cons<D, D2>>> {
    // TODO: let the stream type determine default executor service
    const executorService = (input.props && input.props.executorService) || new Lambda.ExecutorService({
      memorySize: 128,
      timeout: core.Duration.seconds(10)
    });
    const l = executorService.spawn(scope, id, {
      depends: input.depends === undefined
        ? Dependency.list(...this.dependencies)
        : Dependency.list(input.depends, ...this.dependencies),
      handle: async (event: E, deps) => {
        if (input.depends === undefined) {
          for await (const value of this.run(event, deps as any)) {
            await input.handle(value, undefined as any);
          }
        } else {
          for await (const value of this.run(event, (deps as any[]).slice(1) as Clients<D>)) {
            await input.handle(value, deps[0] as Client<D2>);
          }
        }
      }
    });
    l.addEventSource(this.eventSource(input.props));
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
  public forBatch<D2 extends Dependency<any> | undefined>(scope: core.Construct, id: string, input: {
    depends?: D2;
    handle: (value: T[], deps: Client<D2>) => Promise<any>;
    props?: C;
  }): Lambda.Function<E, any, D2 extends undefined ? Dependency.List<D> : Dependency.List<Cons<D, D2>>> {
    return this.batched().forEach(scope, id, input);
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
  public collect<T>(scope: core.Construct, id: string, collector: Collector<T, this>): T {
    return collector.collect(scope, id, this);
  }
}

export namespace Stream {
  /**
   * Props to configure a `Stream's` evaluation runtime properties.
   */
  export interface Config {
    /**
     * The executor service of a `Stream` can always be customized.
     */
    executorService?: Lambda.ExecutorService;
  }
}
