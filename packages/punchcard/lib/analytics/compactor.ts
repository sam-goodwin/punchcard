import cdk = require('@aws-cdk/core');

import * as DynamoDB from '../dynamodb';
import * as Glue from '../glue';
import { RuntimeShape } from '../shape/shape';

export interface CompactorProps<T extends Glue.Table<any, any>, P extends Glue.Partition> {
  sourceTable: T;
  newPartition: P;
  repartition(value: RuntimeShape<Glue.Partitions<T>>): RuntimeShape<Glue.Columns<T>>;
}
export class Compactor<T extends Glue.Table<any, any>, P extends Glue.Partition> extends cdk.Construct {
  public readonly sourceTable: T;
  public readonly destinationTable: Glue.Table<Glue.Columns<T>, P>;

  constructor(scope: cdk.Construct, id: string, props: CompactorProps<T, P>) {
    super(scope, id);
    this.sourceTable = props.sourceTable;

    this.sourceTable.

    // this.destinationTable = new Glue.Table(this, 'DestinationTable', {
    //   bucket: this.sourceTable.resource.bucket,
    //   columns: this.sourceTable.shape.columns,
    //   partition: {
    //     keys: this.sourceTable.shape.partitions,
    //     get: this.sourceTable.partition
    //   },
    // });
  }
}

