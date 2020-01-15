import core = require('@aws-cdk/core');

import { ClassType, NothingShape, Shape } from '@punchcard/shape';
import { Value } from '@punchcard/shape-runtime';
import { Build } from '../core/build';
import { Dependency } from '../core/dependency';
import { Table, TableProps } from '../glue/table';
import { Function } from '../lambda/function';
import { Collector } from '../util/collector';
import { Cons } from '../util/hlist';
import { DependencyType, EventType, Stream } from '../util/stream';

/**
 * Add a utility method `toGlueTable` for `Stream` which uses the `TableCollector` to produce Glue `Tables`.
 */
declare module '../util/stream' {
  interface Stream<E extends Shape, T, D extends any[], C extends Stream.Config> {
    /**
     * Collect data to S3 via a Firehose Delivery Stream.
     *
     * @param scope
     * @param id
     * @param tableProps properties of the created s3 delivery stream
     * @param runtimeConfig optional runtime properties to configure the function processing the stream's data.
     */
    toGlueTable<C extends ClassType>(scope: Build<core.Construct>, id: string, tableProps: TableProps<C>, runtimeConfig?: C): CollectedGlueTable<C, this>;
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
export class GlueTableCollector<T extends ClassType, S extends Stream<any, Value.Of<T>, any, any>> implements Collector<CollectedGlueTable<T, S>, S> {
  constructor(private readonly props: TableProps<T>) { }

  public collect(scope: Build<core.Construct>, id: string, stream: S): CollectedGlueTable<T, S> {
    return new CollectedGlueTable(scope, id, {
      ...this.props,
      stream
    });
  }
}

/**
 * Properties for creating a collected `Table`.
 */
export interface CollectedGlueTableProps<T extends ClassType, S extends Stream<any, Value.Of<T>, any, any>> extends TableProps<T> {
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
export class CollectedGlueTable<C extends ClassType, S extends Stream<any, any, any, any>> extends Table<C> {
  public readonly sender: Function<EventType<S>, NothingShape, Dependency.Concat<Cons<DependencyType<S>, Dependency<Table.Client<C>>>>>;

  constructor(scope: Build<core.Construct>, id: string, props: CollectedGlueTableProps<C, S>) {
    super(scope, id, props);
    this.sender = props.stream.forBatch(this.resource, 'ToTable', {
      depends: this.writeAccess(),
    }, (events, self) => self.sink(events)) as any;
  }
}
