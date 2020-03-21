import { NothingShape, RecordType, Value } from '@punchcard/shape';
import { Build } from '../core/build';
import { Dependency } from '../core/dependency';
import { Table, TableProps } from '../glue/table';
import { Function } from '../lambda/function';
import { Collector } from '../util/collector';
import { Cons } from '../util/hlist';
import { DependencyType, EventType, Stream } from '../util/stream';

import * as cdk from '@aws-cdk/core';

/**
 * Add a utility method `toGlueTable` for `Stream` which uses the `TableCollector` to produce Glue `Tables`.
 */
declare module '../util/stream' {
  interface Stream<E, T, D extends any[], C> {
    /**
     * Collect data to S3 via a Firehose Delivery Stream.
     *
     * @param scope
     * @param id
     * @param tableProps properties of the created s3 delivery stream
     * @param runtimeConfig optional runtime properties to configure the function processing the stream's data.
     */
    toGlueTable<T extends RecordType, P extends RecordType>(scope: Build<cdk.Construct>, id: string, tableProps: TableProps<T, P>, runtimeConfig?: T): CollectedGlueTable<T, P, this>;
  }
}
Stream.prototype.toGlueTable = function(scope: Build<cdk.Construct>, id: string, tableProps: any): any {
  return this.collect(scope, id, new GlueTableCollector(tableProps));
};

/**
 * Creates a new Glue `Table` and publishes data from a `Stream` to it.
 *
 * @typeparam T type of notififcations sent to (and emitted from) the Glue Table.
 */
export class GlueTableCollector<T extends RecordType, P extends RecordType, S extends Stream<any, Value.Of<T>, any, any>> implements Collector<CollectedGlueTable<T, P, S>, S> {
  constructor(private readonly props: TableProps<T, P>) { }

  public collect(scope: Build<cdk.Construct>, id: string, stream: S): CollectedGlueTable<T, P, S> {
    return new CollectedGlueTable(scope, id, {
      ...this.props,
      stream
    });
  }
}

/**
 * Properties for creating a collected `Table`.
 */
export interface CollectedGlueTableProps<T extends RecordType, P extends RecordType, S extends Stream<any, Value.Of<T>, any, any>> extends TableProps<T, P> {
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
export class CollectedGlueTable<T extends RecordType, P extends RecordType, S extends Stream<any, any, any, any>> extends Table<T, P> {
  public readonly sender: Function<EventType<S>, NothingShape, Dependency.Concat<Cons<DependencyType<S>, Dependency<Table.Client<T, P>>>>>;

  constructor(scope: Build<cdk.Construct>, id: string, props: CollectedGlueTableProps<T, P, S>) {
    super(scope, id, props);
    this.sender = props.stream.forBatch(this.resource, 'ToTable', {
      depends: this.writeAccess(),
    }, (events, self) => self.sink(events)) as any;
  }
}
