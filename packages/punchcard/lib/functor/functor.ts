import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/cdk');
import { LambdaExecutorService } from '../compute';
import { ClientContext, Clients } from '../runtime';

/**
 * Props to configure an enumeration's evaluation runtime properties.
 */
export interface FunctorProps {
  /**
   * By default, the executor service of an enumeration can be customized.
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
   * Asynchronously processes an event and yields values.
   *
   * @param event sqs event payload
   * @param clients bootstrapped clients
   */
  run(event: E, clients: Clients<C>): AsyncIterableIterator<T[]>;

  /**
   * Client context (i.e. clients to be made available at runtime).
   */
  readonly context: C;

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
   * Enumerate batches of values.
   *
   * @param scope under which this construct should be created
   * @param id of the construct
   * @param f next transformation of a batch of records
   * @param props optional props for configuring the consmer
   */
  forBatch(scope: cdk.Construct, id: string, f: (values: T[], clients: Clients<C>) => Promise<any>, props?: P): lambda.Function;
  /**
   * Enumerate each value.
   *
   * If you want to use batch APIs, e.g. for calling `PutRecords` on a kinesis stream, then use
   * `forBatch` instead.
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

export abstract class Functor<E, T, C extends ClientContext, P extends FunctorProps> implements IFunctor<E, T, C, P> {
  constructor(public readonly context: C) {}

  public forEach(scope: cdk.Construct, id: string, f: (value: T, clients: Clients<C>) => Promise<any>, props?: P): lambda.Function {
    return this.forBatch(scope, id, (values, clients) => Promise.all(values.map(v => f(v, clients))), props);
  }

  public forBatch(scope: cdk.Construct, id: string, f: (values: T[], clients: Clients<C>) => Promise<any>, props?: P): lambda.Function {
    const executorService = (props && props.executorService) || new LambdaExecutorService({
      memorySize: 128,
      timeout: 10
    });
    return executorService.spawn(scope, id, {
      clients: this.context,
      handle: async (event: E, clients) => {
        for await (const batch of this.run(event, clients)) {
          await f(batch, clients);
        }
      }
    });
  }

  public abstract run(event: E, clients: Clients<C>): AsyncIterableIterator<T[]>;

  public map<U>(f: (value: T, clients: Clients<C>) => Promise<U>): IFunctor<E, U, C, P> {
    return this.chain<E, T, U, C, P>(this.context, this, (values, clients) => Promise.all(values.map(v => f(v, clients))));
  }

  public clients<C2 extends ClientContext>(context: C2): IFunctor<E, T, C & C2, P> {
    return this.chain<E, T, T, C & C2, P>({
      ...this.context,
      ...context,
    }, this as any, v => Promise.resolve(v));
  }

  protected chain<E, T, U, C extends ClientContext, P extends FunctorProps>(
      context: C, parent: IFunctor<E, T, C, P>, f: (values: T[], clients: Clients<C>) => Promise<U[]>):
        IFunctor<E, U, C, P> {
    return new FunctorChain(context, parent, f);
  }
}

class FunctorChain<E, T, U, C extends ClientContext, P extends FunctorProps> extends Functor<E, U, C, P> {
  constructor(context: C,
              private readonly parent: IFunctor<E, T, C, P>,
              private readonly f: (values: T[], clients: Clients<C>) => Promise<U[]>) {
    super(context);
  }
  public async *run(event: E, clients: Clients<C>): AsyncIterableIterator<U[]> {
    for await (const batch of this.parent.run(event, clients)) {
      yield await this.f(batch, clients);
    }
  }
}