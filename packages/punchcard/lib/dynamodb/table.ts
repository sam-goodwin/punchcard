import AWS = require('aws-sdk');

import dynamodb = require('@aws-cdk/aws-dynamodb');
import iam = require('@aws-cdk/aws-iam');
import cdk = require('@aws-cdk/cdk');

import { Cache, PropertyBag } from '../property-bag';
import { Client, Runtime } from '../runtime';
import { Dynamo, Mapper, RuntimeShape, Shape, struct } from "../shape";
import { Omit } from '../utils';
import { HashTableClient, HashTableClientImpl, SortedTableClient, SortedTableClientImpl, TableClient } from "./client";
import { Facade, toFacade } from './expression/path';
import { CompositeKey, HashKey, keyType } from './key';

export interface ITable<S extends Shape, K extends Shape> {
  readonly shape: S;
  readonly key: K;
  readonly facade: Facade<S>;
  readonly keyFacade: Facade<K>;
  readonly mapper: Mapper<RuntimeShape<S>, AWS.DynamoDB.AttributeMap>;
  readonly keyMapper: Mapper<RuntimeShape<K>, AWS.DynamoDB.AttributeMap>;
}

interface TableProps<S extends Shape, K extends Shape> {
  key: K;
  shape: S;
  props: dynamodb.TableProps
}

export abstract class Table<C extends TableClient<S, K>, S extends Shape, K extends Shape>
    extends dynamodb.Table implements Client<C>, ITable<S, K> {
  public static readonly cacheKey = 'aws:dynamodb';

  public readonly shape: S;
  public readonly key: K;
  public readonly facade: Facade<S>;
  public readonly keyFacade: Facade<K>;
  public readonly mapper: Mapper<RuntimeShape<S>, AWS.DynamoDB.AttributeMap>;
  public readonly keyMapper: Mapper<RuntimeShape<K>, AWS.DynamoDB.AttributeMap>;

  constructor(scope: cdk.Construct, id: string, props: TableProps<S, K>) {
    super(scope, id, props.props);

    this.key = props.key;
    this.shape = props.shape;
    this.mapper = new Dynamo.Mapper(struct(props.shape));
    this.keyMapper = new Dynamo.Mapper(struct(this.key));
    this.facade = toFacade(props.shape);
  }

  public bootstrap(properties: PropertyBag, cache: Cache): C {
    return this.makeClient(
      properties.get('tableName'),
      cache.getOrCreate(Table.cacheKey, () => new AWS.DynamoDB()));
  }

  protected abstract makeClient(tableName: string, client: AWS.DynamoDB): C;

  public install(target: Runtime): void {
    this.readWriteData().install(target);
  }

  private _install(grant: (grantable: iam.IGrantable) => void): Client<C> {
    return {
      install: (target) => {
        target.properties.set('tableName', this.tableName);
        grant(target.grantable);
      },
      bootstrap: this.bootstrap.bind(this)
    };
  }

  public readData(): Client<C> {
    return this._install(this.grantReadData.bind(this));
  }

  public readWriteData(): Client<C> {
    return this._install(this.grantReadWriteData.bind(this));
  }

  public writeData(): Client<C> {
    return this._install(this.grantWriteData.bind(this));
  }

  public fullAccess(): Client<C> {
    return this._install(this.grantFullAccess.bind(this));
  }
}

export type HashTableProps<S extends Shape, P extends keyof S> = {
  partitionKey: P;
  shape: S;
} & Omit<dynamodb.TableProps, 'partitionKey' | 'sortKey'>;

export class HashTable<S extends Shape, P extends keyof S>
    extends Table<HashTableClient<S, P>, S, HashKey<S, P>> {

  public static readonly cacheKey = 'aws:dynamodb';

  public readonly partitionKey: P;

  constructor(scope: cdk.Construct, id: string, props: HashTableProps<S, P>) {
    super(scope, id, {
      shape: props.shape,
      key: {
        [props.partitionKey.toString()]: props.shape[props.partitionKey]
      } as any,
      props: {
        ...props,
        partitionKey: {
          name: props.partitionKey.toString(),
          type: keyType(props.shape[props.partitionKey].kind)
        }
      }
    });
    this.partitionKey = props.partitionKey;
  }

  public makeClient(tableName: string, client: AWS.DynamoDB): HashTableClient<S, P> {
    return new HashTableClientImpl(this, tableName, client);
  }
}

export type SortedTableProps<S, PKey extends keyof S, SKey extends keyof S> = {
  shape: S;
  partitionKey: PKey;
  sortKey: SKey;
} & Omit<dynamodb.TableProps, 'partitionKey' | 'sortKey'>;

export class SortedTable<S extends Shape, PKey extends keyof S, SKey extends keyof S>
    extends Table<SortedTableClient<S, PKey, SKey>, S, CompositeKey<S, PKey, SKey>> {
  public readonly partitionKey: PKey;
  public readonly partitionKeyType: dynamodb.AttributeType;
  public readonly sortKey: SKey;
  public readonly sortKeyType: dynamodb.AttributeType;

  constructor(scope: cdk.Construct, id: string, props: SortedTableProps<S, PKey, SKey>) {
    super(scope, id, {
      shape: props.shape,
      key: {
        [props.partitionKey.toString()]: props.shape[props.partitionKey],
        [props.sortKey.toString()]: props.shape[props.partitionKey]
      } as any,
      props: {
        ...props,
        partitionKey: {
          name: props.partitionKey.toString(),
          type: keyType(props.shape[props.partitionKey].kind)
        },
        sortKey: {
          name: props.sortKey.toString(),
          type: keyType(props.shape[props.sortKey].kind)
        }
      }
    });
    this.partitionKey = props.partitionKey;
    this.partitionKeyType = keyType(this.shape[this.partitionKey].kind);
    this.sortKey = props.sortKey;
    this.sortKeyType = keyType(this.shape[this.sortKey].kind);
  }

  protected makeClient(tableName: string, client: AWS.DynamoDB): SortedTableClient<S, PKey, SKey> {
    return new SortedTableClientImpl(this, tableName, client);
  }
}
