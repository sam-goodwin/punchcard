
import cdk = require('@aws-cdk/cdk');

import { Dependency, Function } from '../compute';
import { Cons } from '../compute/hlist';
import { Shape } from '../shape';
import { Partition, Table, TableProps } from '../storage';
import { Enumerable } from './enumerable';

declare module './enumerable' {
  interface Enumerable<E, I, D extends any[], R extends EnumerableRuntime> {
    /**
     * Deliver data to S3 via a Kinesis Firehose Delivery Stream.
     *
     * @param scope construct scope
     * @param id of the flow
     * @param streamProps properties for the delivery stream
     * @param props properties for the enumeration infrastructure (lambda functionse etc.)
     */
    toGlue<S extends Shape, P extends Partition>(scope: cdk.Construct, id: string, props: TableProps<S, P>): [Table<S, P>, Function<E, void, Dependency.List<Cons<D, Table<S, P>>>>];
  }
}
Enumerable.prototype.toGlue = function(scope: cdk.Construct, id: string, props: any): any {
  scope = new cdk.Construct(scope, id);
  const table = new Table<any, any>(scope, 'Table', props);
  return [table, this.collect(scope, 'ToGlue', table)] as any;
};
