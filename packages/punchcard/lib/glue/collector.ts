import core = require('@aws-cdk/core');

import { Build } from '../core/build';
import { Dependency } from '../core/dependency';
import { Columns, PartitionKeys, Table, TableProps } from '../glue/table';
import { Function } from '../lambda/function';
import { RuntimeShape } from '../shape/shape';
import { StructShape } from '../shape/struct';
import { Collector } from '../util/collector';
import { Cons } from '../util/hlist';
import { DependencyType, EventType, Stream } from '../util/stream';

/**
 * Add a utility method `toGlueTable` for `Stream` which uses the `TableCollector` to produce Glue `Tables`.
 */
declare module '../util/stream' {
  interface Stream<E, T, D extends any[], C extends Stream.Config> {
    /**
     * Collect data to S3 via a Firehose Delivery Stream.
     *
     * @param scope
     * @param id
     * @param tableProps properties of the created s3 delivery stream
     * @param runtimeConfig optional runtime properties to configure the function processing the stream's data.
     */
    toGlueTable<C extends Columns, T extends StructShape<C>, P extends PartitionKeys>(scope: Build<core.Construct>, id: string, tableProps: TableProps<C, P>, runtimeConfig?: C): CollectedGlueTable<C, P, this>;
  }
}
Stream.prototype.toGlueTable = function(scope: Build<core.Construct>, id: string, tableProps: any): any {
  return this.collect(scope, id, new GlueTableCollector(tableProps));
};

/**
 * Creates a new Glue `Table` and publishes data from a `Stream` to it.
 *
 * @typeparam T type of notififcations sent to (and emitted from) the Glue Table.
 */
export class GlueTableCollector<Cols extends Columns, P extends PartitionKeys, S extends Stream<any, RuntimeShape<StructShape<Cols>>, any, any>> implements Collector<CollectedGlueTable<Cols, P, S>, S> {
  constructor(private readonly props: TableProps<Cols, P>) { }

  public collect(scope: Build<core.Construct>, id: string, stream: S): CollectedGlueTable<Cols, P, S> {
    return new CollectedGlueTable(scope, id, {
      ...this.props,
      stream
    });
  }
}

/**
 * Properties for creating a collected `Table`.
 */
export interface CollectedGlueTableProps<C extends Columns, P extends PartitionKeys, S extends Stream<any, RuntimeShape<StructShape<C>>, any, any>> extends TableProps<C, P> {
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
export class CollectedGlueTable<C extends Columns, P extends PartitionKeys, S extends Stream<any, any, any, any>> extends Table<C, P> {
  public readonly sender: Function<EventType<S>, void, Dependency.Concat<Cons<DependencyType<S>, Dependency<Table.Client<C, P>>>>>;

  constructor(scope: Build<core.Construct>, id: string, props: CollectedGlueTableProps<C, P, S>) {
    super(scope, id, props);
    this.sender = props.stream.forBatch(this.resource, 'ToTable', {
      depends: this.writeAccess(),
    }, (events, self) => self.sink(events)) as any;
  }
}
