import { BillingMode } from '@aws-cdk/aws-dynamodb';
import iam = require('@aws-cdk/aws-iam');
import core = require('@aws-cdk/core');

import { Core, DynamoDB } from 'punchcard';
import { Cache, Dependency, Namespace } from 'punchcard/lib/core';
import { string, timestamp } from 'punchcard/lib/shape';

export class Lock extends core.Construct implements Dependency<Lock.Client> {
  public readonly lockTable: Lock.Table;

  constructor(scope: core.Construct, id: string) {
    super(scope, id);

    this.lockTable = new Lock.Table(this, 'LockTable', {
      partitionKey: 'key',
      attributes: Lock.Attributes,
      billingMode: BillingMode.PAY_PER_REQUEST
    });

  }
  public install(namespace: Namespace, grantable: iam.IGrantable): void {
    this.lockTable.install(namespace, grantable);
  }

  public async bootstrap(namespace: Namespace, cache: Cache): Promise<Lock.Client> {
    return new Lock.Client(await this.lockTable.bootstrap(namespace, cache));
  }
}

export namespace Lock {
  export class Table extends DynamoDB.Table<'key', undefined, Attributes> {}
  export type Attributes = typeof Attributes;
  export const Attributes = {
    key: string(),
    owner: string(),
    expiry: timestamp
  };

  export interface AcquireRequest {
    tableName: string;
    hour: Date;
    owner: string;
    expiry: Date;
    /**
     * @default 1 minute
     */
    timeoutMs?: number;
  }
  export interface ReleaseRequest {
    tableName: string;
    hour: Date;
    owner: string;
  }
  export class Client {
    constructor(
      public readonly client: Core.Client<Table>) {}

    public async acquire(request: AcquireRequest): Promise<void> {
      console.log('acquiring lock', request);
      const startTime = new Date();
      const timeoutMs = request.timeoutMs || 60 * 1000;
      const timeoutTime = startTime.getTime() + timeoutMs;

      const acquire = async () => {
        try {
          await this.client.put({
            item: {
              key: `${request.tableName}${request.hour.toISOString()}`,
              owner: request.owner,
              expiry: request.expiry
            },
            if: item => DynamoDB.or(
              item.key.isNotSet(),
              item.expiry.lessThan(new Date()),
              item.owner.equals(request.owner)
            )
          });
        } catch (err) {
          if (DynamoDB.ErrorCode.ConditionalCheckFailed.is(err)) {
            if (new Date().getTime() < timeoutTime) {
              console.log('failed to acquire lock, retrying in 5 seconds');
              await new Promise((resolve) => {
                setTimeout(() => {
                  resolve();
                }, 5000);
              });
              await acquire();
            }
            throw new Error(`failed to acquire lock after ${timeoutMs}ms`);
          }
          throw err;
        }
      };

      await acquire();
    }

    public async release(request: ReleaseRequest): Promise<void> {
      console.log('releasing lock', request);
      await this.client.delete({
        key: {
          key: `${request.tableName}${request.hour.toISOString()}`,
        },
        if: item => DynamoDB.or(
          item.key.isNotSet(),
          item.expiry.lessThan(new Date()),
          item.owner.equals(request.owner)
        )
      });
    }
  }
}
