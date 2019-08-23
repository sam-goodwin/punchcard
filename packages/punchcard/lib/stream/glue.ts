import core = require('@aws-cdk/core');

import { Dependency } from '../compute/dependency';
import { Cons } from '../compute/hlist';
import { Function } from '../compute/lambda';
import { RuntimeShape, Shape } from '../shape/shape';
import { StructType } from '../shape/types/struct';
import { Type } from '../shape/types/type';
import { Glue } from '../storage';
import { Collector } from './collector';
import { DependencyType, EventType, Stream } from './stream';

/**
 * Creates a new Glue `Table` and publishes data from a `Stream` to it.
 *
 * @typeparam T type of notififcations sent to (and emitted from) the Glue Table.
 */
export class GlueTableCollector<S extends Shape, P extends Glue.Partition, E extends Stream<any, RuntimeShape<S>, any, any>> implements Collector<CollectedGlueTable<S, P, E>, E> {
  constructor(private readonly props: Glue.TableProps<S, P>) { }

  public collect(scope: core.Construct, id: string, stream: E): CollectedGlueTable<S, P, E> {
    return new CollectedGlueTable(scope, id, {
      ...this.props,
      stream
    });
  }
}

/**
 * Properties for creating a collected `Table`.
 */
export interface CollectedGlueTableProps<T extends Shape, P extends Glue.Partition, S extends Stream<any, RuntimeShape<T>, any, any>> extends Glue.TableProps<T, P> {
  /**
   * Source of the data; a stream.
   */
  readonly stream: S;
}

/**
 * A Glue `Table` produced by collecting data from a `Stream`.
 *
 * @typeparam T shape of data
 * @typeparam P shape of partition keys
 * @typeparam S stream of data to ingest into the table
 */
export class CollectedGlueTable<T extends Shape, P extends Glue.Partition, S extends Stream<any, any, any, any>> extends Glue.Table<T, P> {
  public readonly sender: Function<EventType<S>, void, Dependency.List<Cons<DependencyType<S>, Dependency<Glue.Table.Client<T, P>>>>>;

  constructor(scope: core.Construct, id: string, props: CollectedGlueTableProps<T, P, S>) {
    super(scope, id, props);
    this.sender = props.stream.forBatch(this.resource, 'ToTable', {
      depends: this,
      handle: async (events, self) => {
        self.sink(events);
      }
    }) as any;
  }
}

/**
 * Add a utility method `toGlueTable` for `Stream` which uses the `TableCollector` to produce Glue `Tables`.
 */
declare module './stream' {
  interface Stream<E, T, D extends any[], R extends Stream.Config> {
    /**
     * Collect data to S3 via a Firehose Delivery Stream.
     *
     * @param scope
     * @param id
     * @param tableProps properties of the created s3 delivery stream
     * @param runtimeConfig optional runtime properties to configure the function processing the stream's data.
     */
    toGlueTable<S extends Shape, T extends StructType<S>, P extends Glue.Partition>(scope: core.Construct, id: string, tableProps: Glue.TableProps<S, P>, runtimeConfig?: R): CollectedGlueTable<S, P, this>;
  }
}
Stream.prototype.toGlueTable = function(scope: core.Construct, id: string, tableProps: any, runtimeProps?: any): any {
  return this.collect(scope, id, new GlueTableCollector(tableProps));
};
