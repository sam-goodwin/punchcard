import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/cdk');
import { LambdaExecutorService } from '../lambda/executor';
import { ClientContext, Clients } from '../runtime';

export interface EnumerateProps {
  executorService?: LambdaExecutorService;
}

export interface IEnumerable<T, R extends ClientContext, P extends EnumerateProps> {
  readonly context: R;
  forBatch(scope: cdk.Construct, id: string, f: (values: T[], clients: Clients<R>) => Promise<any>, props?: P): lambda.Function;
  forEach(scope: cdk.Construct, id: string, f: (value: T, clients: Clients<R>) => Promise<any>, props?: P): lambda.Function;
  with<R2 extends ClientContext>(context: R2): IEnumerable<T, R & R2, P>;
}

export interface IStream<T, R extends ClientContext, P extends EnumerateProps> extends IEnumerable<T, R, P> {
  map<U>(f: (value: T) => Promise<U>): IStream<U, R, P>;
  collect<C>(scope: cdk.Construct, id: string, collector: ICollector<T, C>): C;
}

export interface ICollector<T, C> {
  collect(scope: cdk.Construct, id: string, stream: IStream<T, {}, EnumerateProps>): C;
}