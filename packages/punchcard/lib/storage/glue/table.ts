import cdk = require('@aws-cdk/cdk');

import glue = require('@aws-cdk/aws-glue');
import { Shape, Type, Kind } from '../../shape';
import { Omit } from '../../utils';

/**
 * Glue partition shape must be of only string, date or numeric types.
 */
export type Partition = {
  [key: string]: Type<string> | Type<number> | Type<Date> | Type<boolean>;
};

export type TableProps<T extends Shape, P extends Partition> = {
  columns: T;
  partitions: P;
} & Omit<glue.TableProps, 'columns' | 'partitionKeys'>;

export class Table<T extends Shape, P extends Partition> extends glue.Table {
  /**
   * Rich model of the columns and partitions of the table.
   */
  public readonly shape: {
    columns: T;
    partitions: P;
  };

  constructor(scope: cdk.Construct, id: string, props: TableProps<T, P>) {
    super(scope, id, {
      ...props,
      columns: Object.entries(props.columns).map(([name, schema]) => ({
        name,
        type: schema.toGlueType()
      })),
      partitionKeys: Object.entries(props.partitions).map(([name, schema]) => {
        switch (schema.kind) {
          case Kind.String:
          case Kind.Boolean:
          case Kind.Timestamp:
          case Kind.Integer:
          case Kind.Number:
            break;
          default:
            throw new Error(`invalid type for partition key ${schema}, must be string, numeric, boolean or timestamp`);
        }
        return {
          name,
          type: schema.toGlueType()
        };
      }),
    });

    this.shape = {
      columns: props.columns,
      partitions: props.partitions
    };
  }
}