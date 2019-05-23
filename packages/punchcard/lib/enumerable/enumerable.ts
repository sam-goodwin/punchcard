import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/cdk');
import { LambdaExecutorService } from '../compute';
import { ClientContext, Clients } from '../runtime';

export interface EnumerateProps {
  executorService?: LambdaExecutorService;
}

export interface IEnumerable<T, C extends ClientContext, P extends EnumerateProps> {
  /**
   * Client context (i.e. clients to be made available at runtime).
   */
  readonly context: C;
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
  clients<R2 extends ClientContext>(context: R2): IEnumerable<T, C & R2, P>;
}

// export interface ICollector<T, C> {
//   collect(scope: cdk.Construct, id: string, stream: IStream<T, {}, EnumerateProps>): C;
// }