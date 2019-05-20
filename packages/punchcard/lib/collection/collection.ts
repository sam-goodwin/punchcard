import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/cdk');
import { LambdaExecutorService } from '../lambda/executor';
import { Lifted, RuntimeContext } from '../runtime';

export interface EnumerateProps {
  executorService?: LambdaExecutorService;
}

export interface IEnumerable<T, R extends RuntimeContext, P extends EnumerateProps> {
  readonly context: R;
  forBatch(scope: cdk.Construct, id: string, f: (values: T[], clients: Lifted<R>) => Promise<any>, props?: P): lambda.Function;
  forEach(scope: cdk.Construct, id: string, f: (value: T, clients: Lifted<R>) => Promise<any>, props?: P): lambda.Function;
  lift<R2 extends RuntimeContext>(context: R2): IEnumerable<T, R & R2, P>;
}

export interface IStream<T, R extends RuntimeContext, P extends EnumerateProps> extends IEnumerable<T, R, P> {
  map<U>(f: (value: T) => Promise<U>): IStream<U, R, P>;
  collect<C>(scope: cdk.Construct, id: string, collector: ICollector<T, C>): C;
}

export interface ICollector<T, C> {
  collect(scope: cdk.Construct, id: string, stream: IStream<T, {}, EnumerateProps>): C;
}