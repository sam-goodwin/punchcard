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
 * Creates a new Glue `Table` and publishes data from an enumerable to it.
 *
 * @typeparam T type of notififcations sent to (and emitted from) the Glue Table.
 */
export class GlueTableCollector<S extends Shape, P extends Glue.Partition, E extends Stream<any, RuntimeShape<S>, any, any>> implements Collector<CollectedGlueTable<S, P, E>, E> {
  constructor(private readonly props: Glue.TableProps<S, P>) { }

  public collect(scope: core.Construct, id: string, enumerable: E): CollectedGlueTable<S, P, E> {
    return new CollectedGlueTable(scope, id, {
      ...this.props,
      enumerable
    });
  }
}

/**
 * Properties for creating a collected `Table`.
 */
export interface CollectedGlueTableProps<S extends Shape, P extends Glue.Partition, E extends Stream<any, RuntimeShape<S>, any, any>> extends Glue.TableProps<S, P> {
  /**
   * Source of the data; an enumerable.
   */
  readonly enumerable: E;
}

/**
 * A Glue `Table` produced by collecting data from an `Enumerable`.
 *
 * @typeparam T type of notififcations sent to, and emitted from, the Glue Table.
 */
export class CollectedGlueTable<S extends Shape, P extends Glue.Partition, E extends Stream<any, any, any, any>> extends Glue.Table<S, P> {
  public readonly sender: Function<EventType<E>, void, Dependency.List<Cons<DependencyType<E>, Dependency<Glue.Table.Client<S, P>>>>>;

  constructor(scope: core.Construct, id: string, props: CollectedGlueTableProps<S, P, E>) {
    super(scope, id, props);
    this.sender = props.enumerable.forBatch(this.resource, 'ToTable', {
      depends: this,
      handle: async (events, self) => {
        self.sink(events);
      }
    }) as any;
  }
}

/**
 * Add a utility method `toGlueTable` for `Enumerable` which uses the `TableCollector` to produce Glue `Tables`.
 */
declare module './stream' {
  interface Stream<E, I, D extends any[], R extends StreamRuntime> {
    /**
     * Collect data to S3 via a Firehose Delivery Stream.
     *
     * @param scope
     * @param id
     * @param tableProps properties of the created s3 delivery stream
     * @param runtimeProps optional runtime properties to configure the function processing the enumerable's data.
     * @typeparam T concrete type of data flowing to s3
     */
    toGlueTable<S extends Shape, T extends StructType<S> & Type<I>, P extends Glue.Partition>(scope: core.Construct, id: string, tableProps: Glue.TableProps<S, P>, runtimeProps?: R): CollectedGlueTable<S, P, this>;
  }
}
Stream.prototype.toGlueTable = function(scope: core.Construct, id: string, tableProps: any, runtimeProps?: any): any {
  return this.collect(scope, id, new GlueTableCollector(tableProps));
};
