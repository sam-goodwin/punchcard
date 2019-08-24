import core = require('@aws-cdk/core');

import { Collector } from '../core/collector';
import { Dependency } from '../core/dependency';
import { DependencyType, EventType, Stream } from '../core/stream';
import { Table, TableProps } from '../glue/table';
import { Function } from '../lambda/function';
import { RuntimeShape, Shape } from '../shape/shape';
import { StructType } from '../shape/types/struct';
import { Cons } from '../util/hlist';
import { Partition } from './partition';

/**
 * Add a utility method `toGlueTable` for `Stream` which uses the `TableCollector` to produce Glue `Tables`.
 */
declare module '../core/stream' {
  interface Stream<E, T, D extends any[], C extends Stream.Config> {
    /**
     * Collect data to S3 via a Firehose Delivery Stream.
     *
     * @param scope
     * @param id
     * @param tableProps properties of the created s3 delivery stream
     * @param runtimeConfig optional runtime properties to configure the function processing the stream's data.
     */
    toGlueTable<S extends Shape, T extends StructType<S>, P extends Partition>(scope: core.Construct, id: string, tableProps: TableProps<S, P>, runtimeConfig?: C): CollectedGlueTable<S, P, this>;
  }
}
Stream.prototype.toGlueTable = function(scope: core.Construct, id: string, tableProps: any): any {
  return this.collect(scope, id, new GlueTableCollector(tableProps));
};

/**
 * Creates a new Glue `Table` and publishes data from a `Stream` to it.
 *
 * @typeparam T type of notififcations sent to (and emitted from) the Glue Table.
 */
export class GlueTableCollector<Cols extends Shape, P extends Partition, S extends Stream<any, RuntimeShape<Cols>, any, any>> implements Collector<CollectedGlueTable<Cols, P, S>, S> {
  constructor(private readonly props: TableProps<Cols, P>) { }

  public collect(scope: core.Construct, id: string, stream: S): CollectedGlueTable<Cols, P, S> {
    return new CollectedGlueTable(scope, id, {
      ...this.props,
      stream
    });
  }
}

/**
 * Properties for creating a collected `Table`.
 */
export interface CollectedGlueTableProps<T extends Shape, P extends Partition, S extends Stream<any, RuntimeShape<T>, any, any>> extends TableProps<T, P> {
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
export class CollectedGlueTable<T extends Shape, P extends Partition, S extends Stream<any, any, any, any>> extends Table<T, P> {
  public readonly sender: Function<EventType<S>, void, Dependency.List<Cons<DependencyType<S>, Dependency<Table.Client<T, P>>>>>;

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
