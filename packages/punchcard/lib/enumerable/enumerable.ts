import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/cdk');
import { Collector } from '../collector/collector';
import { Client, Clients, Dependency, Function, LambdaExecutorService } from '../compute';
import { Cons } from '../compute/hlist';

export type EventType<E extends Enumerable<any, any, any, any>> = E extends Enumerable<infer E, any, any, any> ? E : never;
export type InformationType<E extends Enumerable<any, any, any, any>> = E extends Enumerable<any, infer I, any, any> ? I : never;
export type DependencyType<E extends Enumerable<any, any, any, any>> = E extends Enumerable<any, any, infer D, any> ? D : never;

/**
 * Props to configure an `Enumerable's` evaluation runtime properties.
 */
export interface EnumerableRuntime {
  /**
   * The executor service of a `Enumerable` can always be customized.
   */
  executorService?: LambdaExecutorService;
}

/**
 * Represents chainable async operations on a cloud data structure.
 *
 * @typeparam E type of event that triggers the computation, i.e. SQSEvent to a Lambda Function
 * @typeparam I type of information yielded from this source (after transformation)
 * @typeparam D runtime dependencies
 * @typeparam R runtime configuration
 */
export abstract class Enumerable<E, I, D extends any[], R extends EnumerableRuntime> {
  constructor(
      protected readonly previous: Enumerable<E, any, any, R>,
      protected readonly f: (value: AsyncIterableIterator<any>, clients: Clients<D>) => AsyncIterableIterator<I>,
      public readonly dependencies: D) {
    // do nothing
  }

  /**
   * Create an event source to attach to the function.
   *
   * @param props optional properties - must implement sensible defaults
   */
  public abstract eventSource(props?: R): lambda.IEventSource;

  /**
   * Describe a transformation of values.
   *
   * **Warning**: the transformation in a map only runs when terminated, i.e. it is
   * lazily evaluated, so you must call `forEach` or `forBatch`.
   *
   * @param f transformation function
   */
  public map<U, D2 extends Dependency<any> | undefined>(input: {
    depends?: D2;
    handle: (value: I, deps: Client<D2>) => Promise<U>
  }): Enumerable<E, U, D2 extends undefined ? D : Cons<D, D2>, R> {
    return this.flatMap({
      depends: input.depends,
      handle: async (v, c) => [await input.handle(v, c)]
    });
  }

  /**
   * Describe a mapping of one value to (potentially) many.
   *
   * **Warning**: the transformation in a map only runs when terminated, i.e. it is
   * lazily evaluated, so you must call `forEach` or `forBatch`.
   *
   * @param f transformation function
   */
  public flatMap<U, D2 extends Dependency<any> | undefined>(input: {
    depends?: D2;
    handle: (value: I, deps: Client<D2>) => Promise<Iterable<U>>
  }): Enumerable<E, U, D2 extends undefined ? D : Cons<D, D2>, R> {
    return this.chain({
      depends: (input.depends === undefined ? this.dependencies : [input.depends].concat(this.dependencies)) as any,
      handle: (async function*(values: AsyncIterableIterator<I>, clients: any) {
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
    handle: (value: AsyncIterableIterator<I>, deps: Clients<D2>) => AsyncIterableIterator<U>
  }): Enumerable<E, U, D2, R>;

  /**
   * Asynchronously process an event and yield values.
   *
   * @param event payload
   * @param clients bootstrapped clients
   */
  public run(event: E, deps: Clients<D>): AsyncIterableIterator<I> {
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
  public forEach<D2 extends Dependency<any> | undefined>(scope: cdk.Construct, id: string, input: {
    depends?: D2;
    handle: (value: I, deps: Client<D2>) => Promise<any>;
    props?: R;
  }): Function<E, any, D2 extends undefined ? Dependency.List<D> : Dependency.List<Cons<D, D2>>> {
    const executorService = (input.props && input.props.executorService) || new LambdaExecutorService({
      memorySize: 128,
      timeout: 10
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
  public forBatch<D2 extends Dependency<any> | undefined>(scope: cdk.Construct, id: string, input: {
    depends?: D2;
    handle: (value: I[], deps: Client<D2>) => Promise<any>;
    props?: R;
  }): Function<E, any, D2 extends undefined ? Dependency.List<D> : Dependency.List<Cons<D, D2>>> {
    return this.batched().forEach(scope, id, input);
  }

  /**
   * Buffer flowing records into batches.
   *
   * @param size maximum number of records in the batch (defaults to all)
   */
  public batched(size?: number): Enumerable<E, I[], D, R> {
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
  public collect<T>(scope: cdk.Construct, id: string, collector: Collector<T, this>): T {
    return collector.collect(scope, id, this);
    // return [sink, this.forBatch(scope, id, {
    //   depends: sink,
    //   async handle(values, sink) {
    //     await sink.sink(values);
    //   }
    // }) as any];
  }
}
