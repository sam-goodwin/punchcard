import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/cdk');
import { LambdaExecutorService } from '../compute';
import { ClientContext, Clients } from '../runtime';

export interface EnumerateProps {
  executorService?: LambdaExecutorService;
}

export interface IEnumerable<T, C extends ClientContext, P extends EnumerateProps> {
  readonly context: C;
  forBatch(scope: cdk.Construct, id: string, f: (values: T[], clients: Clients<C>) => Promise<any>, props?: P): lambda.Function;
  forEach(scope: cdk.Construct, id: string, f: (value: T, clients: Clients<C>) => Promise<any>, props?: P): lambda.Function;
  clients<R2 extends ClientContext>(context: R2): IEnumerable<T, C & R2, P>;
}

// export interface ICollector<T, C> {
//   collect(scope: cdk.Construct, id: string, stream: IStream<T, {}, EnumerateProps>): C;
// }