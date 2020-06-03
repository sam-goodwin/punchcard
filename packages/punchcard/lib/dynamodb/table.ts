import AWS = require('aws-sdk');

import type * as dynamodb from '@aws-cdk/aws-dynamodb';
import type * as iam from '@aws-cdk/aws-iam';
import type * as cdk from '@aws-cdk/core';

import { any, array, map, optional, Record, RecordShape, string } from '@punchcard/shape';
import { DDB, TableClient } from '@punchcard/shape-dynamodb';
import { $if, call, DataSourceBindCallback, DataSourceProps, DataSourceType, getState, VBool, VExpression, VInteger, VObject, VString, VTL, vtl } from '../appsync';
import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Construct, Scope } from '../core/construct';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { Run } from '../core/run';
import { DynamoExpr } from './dsl/dynamo-expr';
import { DynamoDSL } from './dsl/dynamo-repr';
import { toAttributeValueJson } from './dsl/to-attribute-value';
import { UpdateRequest } from './dsl/update-request';
import { QueryRequest, QueryResponse } from './query-request';
import { Index } from './table-index';
import { getKeyNames, keyType } from './util';

/**
 * Subset of the CDK's DynamoDB TableProps that can be overriden.
 */
export interface TableOverrideProps extends Omit<dynamodb.TableProps, 'partitionKey' | 'sortKey'> {}

export interface BaseTableProps {
  /**
   * Override the table infrastructure props.
   *
   * Example:
   * ```ts
   * new DynamoDB.Table(scope, 'Table', {
   *   tableProps: CDK.map(({dynamodb}) => ({
   *     billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
   *   }))
   * });
   * ```
   */
  tableProps?: Build<TableOverrideProps>
}

/**
 * TableProps for creating a new DynamoDB Table.
 *
 * @typeparam DataType type of data in the Table.
 * @typeparam Key partition and optional sort keys of the Table (members of DataType)
 */
export interface TableProps<DataType extends RecordShape, Key extends DDB.KeyOf<DataType>> extends BaseTableProps {
  /**
   * Type of data in the Table.
   */
  data: DataType;
  /**
   * Partition and (optional) Sort Key of the Table.
   */
  key: Key;
}

/**
 * Represents a DynamoDB Table.
 *
 * The data in a table is desciberd with a Record:
 * ```ts
 * class Data extends Record({
 *  a: integer,
 *  b: number,
 *  c: timestamp,
 *  d: map(string),
 * }) {}
 * ```
 *
 * Then, when creating a table, you can specify just a partition key:
 * ```ts
 * const table = new DynamoDB.Table(stack, 'table', {
 *   data: Data,
 *   key: {
 *     partition: 'a'
 *   }
 * });
 * ```
 *
 * ... or a partition and sort key:
 * ```ts
 * const table = new DynamoDB.Table(stack, 'table', {
 *   data: Data,
 *   key: {
 *     partition: 'a',
 *     sort: 'b'
 *   }
 * });
 * ```
 *
 * Use in a Function:
 * ```ts
 * new Lambda.Function(stack, 'id', {
 *   depends: table.readAccess()
 * }, async (request, table) => {
 *   // partitio key only
 *   await table.get({
 *     a: 'partition key'
 *   });
 *
 *   // if sort key provided:
 *   await table.get({
 *     a: 'partition key',
 *     b: 'sort key'
 *   });
 *
 *   // etc.
 * })
 * ```
 *
 * @typeparam DataType type of data in the Table.
 * @typeparam Key either a hash key (string literal) or hash+sort key ([string, string] tuple)
 */
export class Table<DataType extends RecordShape, Key extends DDB.KeyOf<DataType>> extends Construct implements Resource<dynamodb.Table> {
  /**
   * The DynamoDB Table Construct.
   */
  public readonly resource: Build<dynamodb.Table>;

  /**
   * RecordShape of data in the table.
   */
  public readonly dataType: DataType;

  /**
   * The table's key (hash key, or hash+sort key pair).
   */
  public readonly key: Key;

  private _keyShape: RecordShape; // cache
  private get keyShape() {
    if (!this._keyShape) {
      const keyMembers: any = {
        [this.key.partition]: this.dataType.Members[this.key.partition as any]
      };
      if (this.key.sort) {
        keyMembers[this.key.sort] = this.dataType.Members[this.key.sort as any];
      }
      this._keyShape = Record(keyMembers);
    }
    return this._keyShape;
  }

  private _attributeValuesShape: RecordShape; // cache
  private get attributeValuesShape() {
    if (!this._attributeValuesShape) {
      const keyShape = this.keyShape;
      const attributeValues = {
        ...this.dataType.Members
      };
      Object.keys(keyShape.Members).forEach(k => delete attributeValues[k]);
      this._attributeValuesShape = Record(attributeValues);
    }
    return this._attributeValuesShape;
  }

  constructor(scope: Scope, id: string, props: TableProps<DataType, Key>) {
    super(scope, id);

    this.dataType = props.data;
    this.key = props.key;

    const [partitionKeyName, sortKeyName] = getKeyNames<DataType>(props.key);

    this.resource = CDK.chain(({dynamodb}) => Scope.resolve(scope).map(scope => {
      const extraTableProps = props.tableProps ? Build.resolve(props.tableProps) : {};

      const dataType = this.dataType;

      return new dynamodb.Table(scope, id, {
        // default to pay per request - better
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        ...extraTableProps,
        partitionKey: {
          name: partitionKeyName,
          type: keyType((dataType.Members as any)[partitionKeyName])
        },
        sortKey: sortKeyName ? {
          name: sortKeyName,
          type: keyType((dataType.Members as any)[sortKeyName])
        } : undefined
      });
    }));
  }

  public get(key: KeyGraphQLRepr<DataType, Key>, props?: Table.DataSourceProps): VTL<VObject.Of<DataType>> {
    const GetItemRequest = Record({
      version: string,
      operation: string,
      key: this.keyShape
    });

    const request = VObject.fromExpr(GetItemRequest, VExpression.json({
      version: '2017-02-28',
      operation: 'GetItem',
      key: toAttributeValueJson(this.keyShape, key)
    }));

    return call(this.dataSourceProps((table, role) => table.grantReadData(role), props), request, this.dataType);
  }

  public put(value: VObject.Like<DataType>, props?: Table.DataSourceProps): VTL<VObject.Of<DataType>> {
    // TODO: address redundancy between this and `get`.
    const PutItemRequest = Record({
      version: string,
      operation: string,
      key: this.keyShape,
      attributeValues: this.attributeValuesShape
    });

    const request = VObject.fromExpr(PutItemRequest, VExpression.json({
      version: '2017-02-28',
      operation: 'PutItem',
      key: toAttributeValueJson(this.keyShape, value),
      attributeValues: toAttributeValueJson(this.attributeValuesShape, value)
    }));

    return call(this.dataSourceProps((table, role) => table.grantWriteData(role), props), request, this.dataType);
  }

  public *update(request: UpdateRequest<DataType, Key>, props?: DataSourceProps): VTL<VObject.Of<DataType>> {
    // TODO: https://docs.aws.amazon.com/appsync/latest/devguide/resolver-mapping-template-reference-dynamodb.html#aws-appsync-resolver-mapping-template-reference-dynamodb-condition-handling
    function* stringList(id: string) {
      return yield* vtl(array(string), {
        local: true,
        id
      })`[]`;
    }
    const condition = yield* stringList('$CONDITION');
    const ADD = yield* stringList('$ADD');
    const DELETE = yield* stringList('$DELETE');
    const SET = yield* stringList('$SET');

    // map of id -> attribute-value
    const expressionValues = yield* vtl(map(any), {
      local: true,
      id: '$VALUES'
    })`{}`;

    // map of name -> id
    const expressionNames = yield* vtl(map(string), {
      local: true,
      id: '$NAMES'
    })`{}`;

    const fields: any = {};
    for (const [name, field] of Object.entries(this.dataType.Members)) {
      fields[name] = DynamoDSL.of(field, new DynamoExpr.Reference(undefined, field, name));
    }

    if (request.condition) {
      yield* request.condition(fields);
    }
    yield* request.transaction(fields);

    const UpdateItemRequestCondition = Record({
      expression: string,
      expressionNames: map(string),
      expressionValues: map(any)
    });

    const UpdateItemRequest = Record({
      version: string,
      operation: string,
      key: this.keyShape,
      update: Record({
        expression: string,
        expressionNames: map(string),
        expressionValues: map(any)
      }),
      condition: optional(UpdateItemRequestCondition)
    });

    const expression = yield* vtl(string, {
      local: true,
      id: '$EXPRESSION'
    })``;

    for (const [name, list] of Object.entries({
      SET,
      ADD,
      DELETE
    })) {
      (yield* getState()).writeLine();
      yield* vtl`## DynamoDB Update Expressions - ${name}`;
      yield* $if(VBool.not(list.isEmpty()), function*() {
        yield* vtl`#set(${expression} = "${expression} ${name} #foreach($item in ${list})$item#if($foreach.hasNext), #end#end")`;
      });
    }

    const updateRequest = VObject.fromExpr(UpdateItemRequest, VExpression.json({
      version: '2017-02-28',
      operation: 'UpdateItem',
      key: toAttributeValueJson(this.keyShape, request.key),
      update: {
        expression,
        expressionNames,
        expressionValues
      },
      condition: yield* $if(VBool.not(condition.isEmpty()), function*() {
        yield* vtl`#set($conditionExpression = "#foreach($item in ${condition})($item)#if($foreach.hasNext) and #end#end")`;

        return yield* VObject.of(UpdateItemRequestCondition, {
          expression: new VString(VExpression.text('$conditionExpression')),
          expressionNames,
          expressionValues
        });
      })
    }));

    return yield* call(
      this.dataSourceProps((table, role) => table.grantWriteData(role), props),
      updateRequest,
      this.dataType
    );
  }

  public query<Q extends QueryRequest<DataType, Key>>(request: Q): VTL<QueryResponse<Q, DataType, Key>> {
    return null as any;
  }

  /**
   * Return an AppSync DataSource for this Table.
   * @param props
   */
  private dataSourceProps(grant: (table: dynamodb.Table, role: iam.IRole) => void, props?: Table.DataSourceProps): Build<DataSourceBindCallback> {
    return Build.concat(
      CDK,
      this.resource,
      props?.serviceRole || Build.of(undefined)
    ).map(([cdk, table, serviceRole]) => (scope: cdk.Construct, id: string) => {
      const role = serviceRole || new cdk.iam.Role(scope, `${id}:Role`, {
        assumedBy: new cdk.iam.ServicePrincipal('appsync')
      });
      grant(table, role);
      return {
        type: DataSourceType.AMAZON_DYNAMODB,
        dynamoDbConfig: {
          awsRegion: table.stack.region,
          tableName: table.tableName,
          useCallerCredentials: props?.useCallerCredentials
        },
        description: props?.description,
        // TODO: are we sure we want to auto-create an IAM Role?
        serviceRoleArn: role.roleArn
      };
    });
  }

  /**
   * Project this table to a subset of its properties.
   *
   * Best done by "Picking" properties from the table's RecordType:
   * ```ts
   * class TableData extends Record({
   *   a: string,
   *   b: string,
   *   c: string,
   *   d: string,
   * }) {}
   * const table = new DynamoDB.Table(.., {
   *   data: TableData,
   *   // etc.
   * }});
   *
   * const TableProjection extends TableData.Pick(['a', 'b']) {}
   *
   * table.projectTo(TableProjection)
   * ```
   * @param projection type of projected data (subset of the Table's properties)
   */
  public projectTo<Projection extends RecordShape>(projection: AssertValidProjection<DataType, Projection>): Projected<this, Projection> {
    return new Projected(this, projection) as any;
  }

  /**
   * Creates a global index that projects ALL attributes.
   *
   * To create a projected gobal index, first call `projectTo` on this table.
   *
   * @param props Global Index props such as name and key information.
   */
  public globalIndex<IndexKey extends DDB.KeyOf<DataType>>(
      props: Index.GlobalProps<DataType, IndexKey>):
        Index.Of<this, DataType, IndexKey> {
    return new Index({
      indexType: 'global',
      indexName: props.indexName,
      key: props.key,
      projection: this.dataType,
      sourceTable: this
    }) as any;
  }

  /**
   * Take a *read-only* dependency on this table.
   */
  public readAccess(): Dependency<Table.ReadOnly<DataType, Key>> {
    return this.dependency((t, g) => t.grantReadData(g));
  }

  /**
   * Take a *read-write* dependency on this table.
   */
  public readWriteAccess(): Dependency<Table.ReadWrite<DataType, Key>> {
    return this.dependency((t, g) => t.grantReadWriteData(g));
  }

  /**
   * Take a *write-only* dependency on this table.
   */
  public writeAccess(): Dependency<Table.WriteOnly<DataType, Key>> {
    return this.dependency((t, g) => t.grantWriteData(g));
  }

  /**
   * Take a *full-access* dependency on this table.
   *
   * TODO: return type of Table.FullAccessClient?
   */
  public fullAccess(): Dependency<Table.ReadWrite<DataType, Key>> {
    return this.dependency((t, g) => t.grantFullAccess(g));
  }

  private dependency(grant: (table: dynamodb.Table, grantable: iam.IGrantable) => void): Dependency<TableClient<DataType, Key>> {
    return {
      install: this.resource.map(table => (ns, grantable) => {
        ns.set('tableName', table.tableName);
        grant(table, grantable);
      }),
      bootstrap: Run.of(async (ns, cache) =>
        new TableClient({
          data: this.dataType,
          key: this.key as any,
          tableName: ns.get('tableName'),
          client: cache.getOrCreate('aws:dynamodb', () => new AWS.DynamoDB())
        }))
    };
  }
}

export type KeyGraphQLRepr<DataType extends RecordShape, K extends DDB.KeyOf<DataType>> = {
  [k in Extract<K[keyof K], string>]: VObject.Of<DataType['Members'][k]>;
};

export namespace Table {
  export interface DataSourceProps {
    description?: string;
    serviceRole?: Build<iam.IRole>;
    /**
     * @default - false
     */
    useCallerCredentials?: boolean;
  }

  export function NewType<DataType extends RecordShape, Key extends DDB.KeyOf<DataType>>(
    input: {
      data: DataType,
      key: Key
    }): Construct.Class<Table<DataType, Key>, BaseTableProps> {
      return class extends Table<DataType, Key> {
        constructor(scope: Scope, id: string, props: BaseTableProps) {
          super(scope, id, {
            ...props,
            ...input
          });
        }
      } as any;
    }
  /**
   * A DynamoDB Table with read-only permissions.
   *
   * Unavailable methods: `put`, `putBatch`, `delete`, `update`.
   */
  export interface ReadOnly<A extends RecordShape, K extends DDB.KeyOf<A>> extends Omit<TableClient<A, K>, 'put' | 'batchPut' | 'delete' | 'update'> {}

  /**
   * A DynamoDB Table with write-only permissions.
   *
   * Unavailable methods: `batchGet`, `get`, `scan`, `query`
   */
  export interface WriteOnly<A extends RecordShape, K extends DDB.KeyOf<A>> extends Omit<TableClient<A, K>, 'batchGet' | 'get' | 'scan' | 'query'> {}

  /**
   * A DynamODB Table with read and write permissions.
   */
  export interface ReadWrite<A extends RecordShape, K extends DDB.KeyOf<A>> extends TableClient<A, K> {}
}

export namespace Table {
  export type Data<T extends Table<any, any>> = T extends Table<infer D, any> ? D : never;
  export type Key<T extends Table<any, any>> = T extends Table<any, infer K> ? K : never;
}

type AssertValidProjection<T extends RecordShape, P extends RecordShape> = T['Members'] extends P['Members'] ? P : never;

/**
 * Represents a Projection of some DynamoDB Table.
 *
 * Used to build projected Secondary Indexes or (todo) Streams.
 *
 * @typeparam SourceTable the projected table
 * @typeparam Projection the type of projected data
 */
export class Projected<SourceTable extends Table<any, any>, Projection extends RecordShape> {
  constructor(public readonly sourceTable: SourceTable, public readonly projection: Projection) {}

  public globalIndex<IndexKey extends DDB.KeyOf<Projection>>(
      props: Index.GlobalProps<Projection, IndexKey>):
        Index.Of<SourceTable, Projection, IndexKey> {
    return new Index({
      indexName: props.indexName,
      indexType: 'global',
      key: props.key,
      projection: this.projection,
      sourceTable: this.sourceTable
    }) as any;
  }
}
