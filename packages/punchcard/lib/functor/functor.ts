import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/cdk');
import { Client, Clients, Dependency, Function, LambdaExecutorService } from '../compute';
import { Cons, cons } from '../compute/hlist';

/**
 * Props to configure a Monad's evaluation runtime properties.
 */
export interface MonadProps {
  /**
   * By default, the executor service of a Monad can be customized.
   */
  executorService?: LambdaExecutorService;
}

/**
 * Represents chainable async operations on a cloud data structure.
 *
 * @typeparam E type of event that triggers the computation, i.e. SQSEvent to a Lambda Function
 * @typeparam T type of records yielded from this source (after transformation)
 * @typeparam C clients required at runtime
 * @typeparam P type of props for configuring computation infrastructure
 */
export abstract class Monad<E, T, D extends any[], P extends MonadProps> {
  constructor(
      protected readonly previous: Monad<E, any, any, P>,
      protected readonly f: (value: AsyncIterableIterator<any>, clients: Clients<D>) => AsyncIterableIterator<T>,
      public readonly dependencies: D) {
    // do nothing
  }

  /**
   * Create an event source to attach to the function.
   *
   * @param props optional properties - must implement sensible defaults
   */
  public abstract eventSource(props?: P): lambda.IEventSource;

  /**
   * Describe a transformation of values.
   *
   * **Warning**: the transformation in a map only runs when terminated, i.e. it is
   * lazily evaluated, so you must call `forEach` or `forBatch`.
   *
   * @param f transformation function
   */
  public map<U, D2 extends Dependency<any>>(input: {
    depends: D2;
    handle: (value: T, deps: Client<D2>) => Promise<U>
  }): Monad<E, U, Cons<D, D2>, P> {
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
  public flatMap<U, D2 extends Dependency<any>>(input: {
    depends: D2;
    handle: (value: T, deps: Client<D2>) => Promise<Iterable<U>>
  }): Monad<E, U, Cons<D, D2>, P> {
    return this.chain({
      depends: [input.depends].concat(this.dependencies) as Cons<D, D2>,
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
  }): Monad<E, U, D2, P>;

  /**
   * Asynchronously process an event and yield values.
   *
   * @param event payload
   * @param clients bootstrapped clients
   */
  public run(event: E, deps: Clients<D>): AsyncIterableIterator<T> {
    return this.f(this.previous.run(event, deps.slice(1) as any), (deps as any[])[0]);
  }

  /**
   * Enumerate each value.
   *
   * @param scope under which this construct should be created
   * @param id of the construct
   * @param f next transformation of a record
   * @param props optional props for configuring the function consuming from SQS
   */
  public forEach<D2 extends Dependency<any>>(scope: cdk.Construct, id: string, input: {
    depends: D2;
    handle: (value: T, deps: Client<D2>) => Promise<any>;
    props?: P;
  }): Function<E, any, Dependency.List<Cons<D, D2>>> {
    const executorService = (input.props && input.props.executorService) || new LambdaExecutorService({
      memorySize: 128,
      timeout: 10
    });
    const l = executorService.spawn(scope, id, {
      depends: Dependency.list(input.depends, ...this.dependencies),
      handle: async (event: E, [left, ...right]) => {
        for await (const value of this.run(event, right as Clients<D>)) {
          await input.handle(value, left);
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
  public forBatch<D2 extends Dependency<any>>(scope: cdk.Construct, id: string, input: {
    depends: D2;
    handle: (value: T, deps: Client<D2>) => Promise<any>;
    props?: P;
  }): Function<E, any, Dependency.List<Cons<D, D2>>> {
    return this.chain({
      depends: this.dependencies,
      async *handle(it) {
        const batch = [];
        for await (const value of it) {
          batch.push(value);
        }
        return yield batch;
      }
    }).forEach(scope, id, input);
  }
}
