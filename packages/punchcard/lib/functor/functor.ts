import lambda = require('@aws-cdk/aws-lambda');
import { IEventSource } from '@aws-cdk/aws-lambda';
import cdk = require('@aws-cdk/cdk');
import { LambdaExecutorService } from '../compute';
import { ClientContext, Clients } from '../runtime';

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
 * @typeparam T type of records yielded from this source (after transformation)
 * @typeparam C clients required at runtime
 * @typeparam P type of enumerate props, for configuring transformation infrastructure
 */
export interface IFunctor<E, T, C extends ClientContext, P extends FunctorProps> {
  /**
   * Client context (i.e. clients to be made available at runtime).
   */
  readonly context: C;

  /**
   * Asynchronously process an event and yield values.
   *
   * @param event sqs event payload
   * @param clients bootstrapped clients
   */
  run(event: E, clients: Clients<C>): AsyncIterableIterator<T>;

  eventSource(props?: P): IEventSource;

  /**
   * Describe a transformation of an enumerable's values.
   *
   * **Warning**: the transformation in a map only runs when terminated, i.e. it is
   * lazily evaluated, so you must call `forEach` or `forBatch`.
   *
   * @param f transformation function
   */
  map<U>(f: (value: T, clients: Clients<C>) => Promise<U>): IFunctor<E, U, C, P>;

  /**
   * Enumerate each value.
   *
   * @param scope under which this construct should be created
   * @param id of the construct
   * @param f next transformation of a record
   * @param props optional props for configuring the function consuming from SQS
   */
  forEach(scope: cdk.Construct, id: string, f: (value: T, clients: Clients<C>) => Promise<any>, props?: P): lambda.Function;

  /**
   * Add more clients to the client context.
   * @param context new client context
   */
  clients<R2 extends ClientContext>(context: R2): IFunctor<E, T, C & R2, P>;
}

/**
 * Base implementation of a Functor.
 */
export abstract class Functor<E, T, C extends ClientContext, P extends FunctorProps> implements IFunctor<E, T, C, P> {
  constructor(public readonly context: C) {}

  public abstract eventSource(props?: P): lambda.IEventSource;

  public forEach(scope: cdk.Construct, id: string, f: (value: T, clients: Clients<C>) => Promise<any>, props?: P): lambda.Function {
    const executorService = (props && props.executorService) || new LambdaExecutorService({
      memorySize: 128,
      timeout: 10
    });
    const l = executorService.spawn(scope, id, {
      clients: this.context,
      handle: async (event: E, clients) => {
        for await (const value of this.run(event, clients)) {
          await f(value, clients);
        }
      }
    });
    l.addEventSource(this.eventSource(props));
    return l;
  }

  public abstract run(event: E, clients: Clients<C>): AsyncIterableIterator<T>;
  public abstract map<U>(f: (value: T, clients: Clients<C>) => Promise<U>): IFunctor<E, U, C, P>;
  public abstract clients<C2 extends ClientContext>(context: C2): IFunctor<E, T, C & C2, P>;
}

export abstract class Monad<E, T, C extends ClientContext, P extends FunctorProps> extends Functor<E, T, C, P> implements Monad<E, T, C, P> {
  constructor(context: C) {
    super(context);
  }

  public map<U>(f: (value: T, clients: Clients<C>) => Promise<U>): Monad<E, U, C, P> {
    return this.flatMap<U>(async (values, clients) => [await f(values, clients)]);
  }

  public flatMap<U>(f: (value: T, clients: Clients<C>) => Promise<U[]>): Monad<E, U, C, P> {
    return this.chain(this.context, f);
  }

  public clients<C2 extends ClientContext>(context: C2): Monad<E, T, C & C2, P> {
    return this.chain({...context, ...this.context}, v => Promise.resolve([v]));
  }

  public abstract chain<U, C2 extends ClientContext>(context: C2, f: (value: T, clients: Clients<C>) => Promise<U[]>): Monad<E, U, C & C2, P>;
}
export interface Monad<E, T, C extends ClientContext, P extends FunctorProps> extends IFunctor<E, T, C, P> {
  buffer(): Monad<E, T[], C, P>;
}

export abstract class Chain<E, T, U, C extends ClientContext, P extends FunctorProps> extends Monad<E, U, C, P> implements Monad<E, U, C, P> {
  constructor(context: C,
              private readonly parent: Monad<E, T, C, P>,
              private readonly f: (values: T, clients: Clients<C>) => Promise<U[]>) {
    super(context);
  }
  public async *run(event: E, clients: Clients<C>): AsyncIterableIterator<U> {
    for await (const value of this.parent.run(event, clients)) {
      for await (const v of await this.f(value, clients)) {
        yield v;
      }
    }
  }

  public eventSource(props?: P): lambda.IEventSource {
    return this.parent.eventSource(props);
  }
}
