import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/cdk');
import { Client, Dependency, Depends, Function, LambdaExecutorService } from '../compute';

/**
 * Props to configure a Monad's evaluation runtime properties.
 */
export interface MonadProps {
  /**
   * By default, the executor service of a Monad can be customized.
   */
  executorService?: LambdaExecutorService;
}

export type FunctorInput<T, U, D extends Dependency<any>> = {
  depends: D,
  handle: (value: T, deps: Client<D>) => U
};

/**
 * Represents chainable async operations on a cloud data structure.
 *
 * @typeparam E type of event that triggers the computation, i.e. SQSEvent to a Lambda Function
 * @typeparam T type of records yielded from this source (after transformation)
 * @typeparam C clients required at runtime
 * @typeparam P type of props for configuring computation infrastructure
 */
export abstract class Monad<E, T, D extends Dependency<any>, P extends MonadProps> {
  constructor(
      protected readonly previous: Monad<E, any, any, P>,
      protected readonly f: (value: AsyncIterableIterator<any>, clients: Client<D>) => AsyncIterableIterator<T>,
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
   * Chain another async generator, flattening results into a single stream.
   *
   * Also, add to the dependencies.
   *
   * @param f chain function which iterates values and yields results.
   * @param dependencies
   */
  public abstract chain<U, D2 extends Dependency<any>>(input: FunctorInput<AsyncIterableIterator<T>, AsyncIterableIterator<U>, Depends.Union<D2, D>>): Monad<E, U, Depends.Union<D2, D>, P>;

  /**
   * Asynchronously process an event and yield values.
   *
   * @param event payload
   * @param clients bootstrapped clients
   */
  public run(event: E, deps: [Client<D>, any]): AsyncIterableIterator<T> {
    return this.f(this.previous.run(event, deps[1]), deps[0]);
  }

  /**
   * Describe a transformation of values.
   *
   * **Warning**: the transformation in a map only runs when terminated, i.e. it is
   * lazily evaluated, so you must call `forEach` or `forBatch`.
   *
   * @param f transformation function
   */
  public map<U, D2 extends Dependency<any>>(input: FunctorInput<T, Promise<U>, D2>): Monad<E, U, Depends.Union<D2, D>, P> {
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
  public flatMap<U, D2 extends Dependency<any>>(input: FunctorInput<T, Promise<Iterable<U>>, D2>): Monad<E, U, Depends.Union<D2, D>, P> {
    return this.chain({
      depends: input.depends,
      handle: (async function*(values: AsyncIterableIterator<T>, clients: [Client<D2>, Client<D>]) {
        for await (const value of values) {
          for (const mapped of await input.handle(value, clients[0])) {
            yield mapped;
          }
        }
      })
    });
  }

  /**
   * Enumerate each value.
   *
   * @param scope under which this construct should be created
   * @param id of the construct
   * @param f next transformation of a record
   * @param props optional props for configuring the function consuming from SQS
   */
  public forEach<D2 extends Dependency<any>>(scope: cdk.Construct, id: string, input: FunctorInput<T, Promise<any>, D2> & {props?: P}): Function<E, any, Depends.Union<D2, D>> {
    const executorService = (input.props && input.props.executorService) || new LambdaExecutorService({
      memorySize: 128,
      timeout: 10
    });
    const l = executorService.spawn(scope, id, {
      depends: Depends.on(this.dependencies, input.depends),
      handle: async (event: E, deps) => {
        for await (const value of this.run(event, deps)) {
          console.log('value', value);
          await input.handle(value, deps[1]);
        }
        console.log('done');
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
  public forBatch<D2 extends Dependency<any>>(scope: cdk.Construct, id: string, input: FunctorInput<T[], Promise<any>, D2> & {props?: P}): Function<E, Depends.Union<D2, Depends.Union<Depends.None, D>>, any> {
    return this.chain({
      depends: Depends.none as any,
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
