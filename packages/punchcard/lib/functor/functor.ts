import lambda = require('@aws-cdk/aws-lambda');
import { IEventSource } from '@aws-cdk/aws-lambda';
import cdk = require('@aws-cdk/cdk');
import { LambdaExecutorService } from '../compute';
import { Function } from '../compute/lambda';
import { Clients, Dependencies, Dependency, Runtime } from '../runtime';

/**
 * Props to configure a Functor's evaluation runtime properties.
 */
export interface FunctorProps {
  /**
   * By default, the executor service of a Functor can be customized.
   */
  executorService?: LambdaExecutorService;
}

/**
 * Represents something that can be mapped over.
 *
 * @typeparam E type of event that triggers the computation, i.e. SQSEvent to a Lambda Function
 * @typeparam T type of records yielded from this source (after transformation)
 * @typeparam C clients required at runtime
 * @typeparam P type of props for configuring computation infrastructure
 */
export interface IFunctor<E, T, D extends Dependencies, P extends FunctorProps> {
  /**
   * Runtime dependencies (i.e. clients to be made available at runtime).
   */
  readonly dependencies: D;

  /**
   * Asynchronously process an event and yield values.
   *
   * @param event payload
   * @param clients bootstrapped clients
   */
  run(event: E, clients: Clients<D>): AsyncIterableIterator<T>;

  /**
   * Create an event source to attach to the function.
   *
   * @param props optional properties - must implement sensible defaults
   */
  eventSource(props?: P): IEventSource;

  /**
   * Describe a transformation of an enumerable's values.
   *
   * **Warning**: the transformation in a map only runs when terminated, i.e. it is
   * lazily evaluated, so you must call `forEach` or `forBatch`.
   *
   * @param f transformation function
   */
  map<U>(f: (value: T, clients: Clients<D>) => Promise<U>): IFunctor<E, U, D, P>;

  /**
   * Enumerate each value.
   *
   * @param scope under which this construct should be created
   * @param id of the construct
   * @param f next transformation of a record
   * @param props optional props for configuring the function consuming from SQS
   */
  forEach(scope: cdk.Construct, id: string, f: (value: T, clients: Clients<D>) => Promise<any>, props?: P): Function<E, void, D>;
}

/**
 * Base implementation of a Functor.
 */
export abstract class Functor<E, T, D extends Dependencies, P extends FunctorProps> implements IFunctor<E, T, D, P> {
  constructor(
    private readonly previous: Functor<E, any, D, P>,
    private readonly f: (value: any, clients: Clients<D>) => Promise<T>,
    public readonly dependencies: D) {}

  public abstract map<U>(f: (value: T, clients: Clients<D>) => Promise<U>): IFunctor<E, U, D, P>;

  public abstract flatMap<U>(f: (run: AsyncIterableIterator<T>, clients: Clients<D>) => Promise<U>): 

  public eventSource(props?: P): lambda.IEventSource {
    return this.previous.eventSource(props);
  }

  public iterate(scope: cdk.Construct, id: string, f: (run: AsyncIterableIterator<T>, clients: Clients<D>) => Promise<any>, props?: P) {
    const executorService = (props && props.executorService) || new LambdaExecutorService({
      memorySize: 128,
      timeout: 10
    });
    const l = executorService.spawn(scope, id, {
      clients: this.dependencies,
      handle: async (event: E, clients) => {
        await f(await this.run(event, clients), clients);
      }
    });
    l.addEventSource(this.eventSource(props));
    return l;
  }

  public forEach(scope: cdk.Construct, id: string, f: (value: T, clients: Clients<D>) => Promise<any>, props?: P): Function<E, any, D> {
    return this.iterate(scope, id, async (run, clients) => {
      for await (const value of run) {
        await f(value, clients);
      }
    });
  }

  public forBatch(scope: cdk.Construct, id: string, f: (value: T[], clients: Clients<D>) => Promise<any>, props?: P): Function<E, any, D> {
    return this.iterate(scope, id, async (run, clients) => {
      const batch = [];
      for await (const value of run) {
        batch.push(value);
      }
      await f(batch, clients);
    });
  }

  public async *run(event: E, clients: Clients<D>): AsyncIterableIterator<T> {
    for await (const value of this.previous.run(event, clients)) {
      yield await this.f(value, clients);
    }
  }
}
