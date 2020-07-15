import * as elasticsearch from 'elasticsearch';

import type * as cloudformation from '@aws-cdk/aws-cloudformation';

import type * as es from '@aws-cdk/aws-elasticsearch';
import type * as iam from '@aws-cdk/aws-iam';
import type * as cdk from '@aws-cdk/core';

import { any, AnyShape, array, boolean, Enum, integer, isOptional, map, Mapper, Meta, number, optional, Shape, ShapeGuards, string, StringShape, Type, TypeShape, Value } from '@punchcard/shape';

import { Json } from '@punchcard/shape-json';
import { call, DataSourceBindCallback, DataSourceType, VExpression } from '../appsync';
import { VTL, vtl } from '../appsync/lang/vtl';
import { VList, VNothing, VObject, VString, VUnion } from '../appsync/lang/vtl-object';
import { Dependency } from '../core';
import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Construct, Scope } from '../core/construct';
import { Resource } from '../core/resource';
import { Run } from '../core/run';
import * as Lambda from '../lambda';
import { sink } from '../util';
import { Domain } from './es-domain';


export class IndexSettings extends Type({
  number_of_shards: integer,
  number_of_replicas: optional(integer),
  auto_expand_replicas: optional(boolean)
}) {}
export class IndexResourceProps extends Type({
  IndexName: string,
  Mappings: any,
  Settings: IndexSettings
}) {}

export const ResourceRequestType = Enum({
  Create: 'Create',
  Delete: 'Delete',
  Update: 'Update',
});

export class IndexResourceRequest extends Type({
  ServiceToken: string,
  /**
   * A required custom resource provider-defined physical ID that is unique for that provider.
   */
  PhysicalResourceId: string,
  /**
   * Type of Request (`Create`, `Update`, `Delete`).
   */
  RequestType: ResourceRequestType,
  /**
   * A unique ID for the request.
   */
  RequestId: string,
  /**
   * The response URL identifies a presigned S3 bucket that receives responses from the custom resource provider to AWS CloudFormation.
   */
  ResponseURL: string,
  /**
   * The template developer-chosen resource type of the custom resource in the AWS CloudFormation template. Custom resource type names can be up to 60 characters long and can include alphanumeric and the following characters: _@-.
   */
  ResourceType: string,
  /**
   * The template developer-chosen name (logical ID) of the custom resource in the AWS CloudFormation template.
   */
  LogicalResourceId: string,
  /**
   * The Amazon Resource Name (ARN) that identifies the stack that contains the custom resource.
   */
  StackId: string,
  /**
   * The new resource property values that are declared by the template developer in the updated AWS CloudFormation template.
   */
  ResourceProperties: IndexResourceProps,
  /**
   * The resource property values that were previously declared by the template developer in the AWS CloudFormation template.
   *
   * Only populated during an `Update`.
   */
  OldResourceProperties: optional(IndexResourceProps)
}) {}

export class IndexResourceResponse extends Type({
  indexName: string
}) {}

export type _ID<T extends TypeShape> = {
  [k in keyof T['Members']]: T['Members'] extends StringShape ? k : never
}[keyof T['Members']];

export interface IndexProps<T extends TypeShape, ID extends keyof T['Members']> {
  indexName: string,
  mappings: T,
  _id: ID,
  settings: IndexSettings;
}
export class Index<T extends TypeShape, ID extends keyof T['Members']> implements Resource<cloudformation.CustomResource> {
  public readonly resource: Build<cloudformation.CustomResource>;
  public readonly indexName: string;
  public readonly mappings: T;
  public readonly _id: ID;

  constructor(scope: Scope, id: string, public readonly domain: Domain, props: IndexProps<T, ID>) {
    this.indexName = props.indexName;
    this.mappings = props.mappings;
    this._id = props._id;
    this.resource = Build.concat(Scope.resolve(scope), CDK, domain.indexResourceProvider).map(([scope, cdk, provider]) =>
      new cdk.cloudformation.CustomResource(scope, id, {
        provider,
        resourceType: 'Custom::ElasticSearchIndex',
        properties: {
          IndexName: props.indexName,
          Mappings: toMappings(props.mappings),
          Settings: props.settings
        }
      }))
    ;
  }

  public readWriteAccess(): Dependency<IndexClient<T, ID>> {
    return this.access({
      actions: [...readActions, ...writeActions],
    });
  }

  public readAccess(): Dependency<IndexClient<T, ID>> {
    return this.access({
      actions: readActions,
    });
  }

  public writeAccess(): Dependency<IndexClient<T, ID>> {
    return this.access({
      actions: writeActions,
    });
  }

  private access(props: {
    actions: string[];
    paths?: string[]
  }): Dependency<IndexClient<T, ID>> {
    const access = this.domain.access(props);
    return {
      install: access.install,
      bootstrap: access.bootstrap.map(bootstrap => async (namespace, cache) => new IndexClient<T, ID>(
        await bootstrap(namespace, cache),
        this.indexName,
        this.mappings,
        this._id
      ))
    };
  }

  public *search(body: any): VTL<{
    scrollID: VUnion<VString | VNothing>
    hits: VList<VObject.Of<T>>
  }> {
    const request = VObject.fromExpr(any, VExpression.json({
      version: '2017-02-28',
      operation: 'GET',
      path: `/${this.indexName}/_search`,
      params: {
        body
      }
    }));

    /*
    Type({
      _index: string,
      _type: string,
      _id: string,
      _score: number,
      _source: this.mappings
    })
    */
    class SearchResponse extends Type({
      _scroll_id: optional(string),
      hits: Type({
        hits: array(map(any))
      })
    }) {}

    const response = yield* call(
      this.dataSourceProps(CDK.map(({iam}) => (domain, role) => {
        role.addToPolicy(new iam.PolicyStatement({
          actions: readActions,
          effect: iam.Effect.ALLOW,
          resources: [
            `${domain.attrArn}/${this.indexName}/*`
          ]
        }));
      })),
      request,
      SearchResponse
    );

    const mappings = this.mappings;
    const hits = yield* vtl(array(this.mappings))`[]`;
    yield* response.hits.hits.forEach(function*(item) {
      yield* hits.push(item.get('_source').as(mappings) as any);
    });

    return {
      scrollID: response._scroll_id,
      hits
    };
  }

  /**
   * Return an AppSync DataSource for this Table.
   * @param props
   */
  public dataSourceProps(grant: Build<(domain: es.CfnDomain, role: iam.IRole) => void>, props?: {
    description?: string;
    serviceRole?: Build<iam.Role>;
  }): Build<DataSourceBindCallback> {
    return Build.concat(
      CDK,
      this.domain.resource,
      props?.serviceRole || Build.of(undefined),
      grant
    ).map(([cdk, domain, serviceRole, grant]) => (scope: cdk.Construct, id: string) => {
      const role = serviceRole || new cdk.iam.Role(scope, `${id}:Role`, {
        assumedBy: new cdk.iam.ServicePrincipal('appsync')
      });
      grant(domain, role);
      return {
        type: DataSourceType.AMAZON_ELASTICSEARCH,
        elasticsearchConfig: {
          awsRegion: domain.stack.region,
          endpoint: `https://${domain.getAtt('DomainEndpoint').toString()}`,
        },
        description: props?.description,
        // TODO: are we sure we want to auto-create an IAM Role?
        serviceRoleArn: role.roleArn
      };
    });
  }
}

const readActions = [
  'es:ESHttpGet',
  'es:ESHttpPost',
];

const writeActions = [
  'es:ESHttpDelete',
  'es:ESHttpPost',
  'es:ESHttpPut',
];

export class IndexClient<T extends TypeShape, ID extends keyof T['Members']> {
  public readonly mapper: Mapper<Value.Of<T>, Json.Of<T>>;
  constructor(
    public readonly client: elasticsearch.Client,
    public readonly indexName: string,
    public readonly mappings: T,
    public readonly _id: ID
  ) {
    this.mapper = Json.mapper(this.mappings, {
      // options?
    });
  }

  /**
   * @see https://www.elastic.co/guide/en/elasticsearch/reference/current/search-search.html
   */
  public async search(props: SearchRequest): Promise<SearchResponse<Value.Of<T>>> {
    const response: elasticsearch.SearchResponse<Json.Of<T>> = await this.client.search({
      scroll: props.scroll,
      body: props.body
    });

    return this.parseHits(response);
  }

  public async scroll(request: ScrollRequest): Promise<SearchResponse<Value.Of<T>>> {
    const response: elasticsearch.SearchResponse<Json.Of<T>> = await this.client.scroll({
      scrollId: request.scrollId,
      scroll: request.scroll
    });

    return this.parseHits(response);
  }

  private parseHits(response: elasticsearch.SearchResponse<Json.Of<T>>) {
    if (!response.timed_out) {
      return {
        hits: response.hits.hits.map((hit: any) => {
          console.log('hit', hit);
          const value = this.mapper.read(hit._source);
          console.log('hit-value', value);
          return value;
        }) as Value.Of<T>[],
        scrollId: response._scroll_id
      };
    } else {
      const error = new Error('response timed out');
      console.error(error);
      throw error;
    }
  }

  public async index(...values: Value.Of<T>[]): Promise<void> {
    const body = values.map(value => {
      const json = this.mapper.write(value) as any;
      let _id: string | undefined = json[this._id];
      _id = json[this._id];
      if (typeof _id !== 'string') {
        console.error('_id', this._id, json);
        throw new Error(`_id '${this._id}' field must be a string, was '${typeof _id}'.`);
      }

      return [{
        index: {
          _index: this.indexName,
          _id
        }
      }, json];
    }).reduce((a, b) => a.concat(b));

    return await sink(body, async (values) => {
      const response: BulkResponse = await this.client.bulk({
        refresh: 'wait_for',
        body
      });
      if (response.errors) {
        return response.items.map((item, i) => {
          console.error(item);
          return body[i];
        });
        // need to redrive erros
      }
      return [];
    }, {
      retry: {
        attemptsLeft: 3,
        backoffMs: 100,
        maxBackoffMs: 10000
      },
      strictOrdering: false
    }, 10000);

  }
}

export interface ScrollRequest {
  scroll: string;
  scrollId: string;
}

export interface SearchRequest {
  scroll?: string;
  body: any;
}

export interface SearchResponse<T> {
  scrollId?: string;
  hits: Value.Of<T>[];
}

/**
 * The bulk API’s response contains the individual results of each operation in the request,
 * returned in the order submitted. The success or failure of an individual operation does
 * not affect other operations in the request.
 *
 * @see https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-bulk.html
 */
interface BulkResponse {
  /**
   * How long, in milliseconds, it took to process the bulk request.
   */
  took: number;
  /**
   * If true, one or more of the operations in the bulk request did not complete successfully
   */
  errors: boolean;
  items: {
    /**
     * The parameter name is an action associated with the operation. Possible values are
     * `create`, `delete`, `index`, and `update`.
     *
     * The parameter value is an object that contains information for the associated operation.
     */
    [action: string]: {
      /**
       * The index name or alias associated with the operation.
       */
      _index: string;
      /**
       * The document type associated with the operation. Elasticsearch indices now support a
       * single document type: _doc. See Removal of mapping types.
       */
      _type: string;
      /**
       * The document ID associated with the operation.
       */
      _id: number;
      /**
       * The document version associated with the operation. The document version is incremented
       * each time the document is updated.
       *
       * This parameter is only returned for successful actions
       */
      _version: number;

      /**
       * Result of the operation. Successful values are `created`, `deleted`, and `updated`.
       *
       * This parameter is only returned for successful operations.
       */
      result: 'created' | 'deleted' | 'updated';

      /**
       * Contains shard information for the operation.
       *
       * This parameter is only returned for successful operations.
       */
      _shards: {
        /**
         * Number of shards the operation attempted to execute on.
         */
        total: number;
        /**
         * Number of shards the operation succeeded on.
         */
        successful: number;
        /**
         * Number of shards the operation attempted to execute on but failed
         */
        failed: number;
      };
      /**
       * The sequence number assigned to the document for the operation. Sequence numbers are
       * used to ensure an older version of a document doesn’t overwrite a newer version. See
       * [Optimistic concurrency control](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-index_.html#optimistic-concurrency-control-index).
       *
       * This parameter is only returned for successful operations.
       */
      _seq_no: number;

      /**
       * The primary term assigned to the document for the operation. See
       * [Optimistic concurrency control](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-index_.html#optimistic-concurrency-control-index).
       *
       * This parameter is only returned for successful operations.
       */
      _primary_term: number;

      /**
       * HTTP status code returned for the operation.
       */
      status: number;
      /**
       * Contains additional information about the failed operation.
       *
       * The parameter is only returned for failed operations.
       */
      error: {
        /**
         * Error type for the operation.
         */
        type: string;
        /**
         * Reason for the failed operation.
         */
        reason: string;
        /**
         * The universally unique identifier (UUID) of the index associated with the failed operation.
         */
        index_uuid: string;
        /**
         * ID of the shard associated with the failed operation.
         */
        shard: string;
        /**
         * The index name or alias associated with the failed operation
         */
        index: string;
      };
    }
  }[]
}

function toMappings<S extends Shape>(shape: S): any {
  const {esMappings} = Meta.get(shape, ['esMappings']);
  if (esMappings) {
    return esMappings;
  }
  if (ShapeGuards.isUnionShape(shape)) {
    if (!isOptional(shape)) {
      throw new Error(`union types are not currently supported`);
    }
    if (ShapeGuards.isNothingShape(shape.Items[0])) {
      return toMappings(shape.Items[1]);
    } else {
      return toMappings(shape.Items[0]);
    }
  } else if (ShapeGuards.isRecordShape(shape)) {
    return {
      properties: Object.entries(shape.Members).map(([name, shape]) => ({
        [name]: toMappings(shape)
      })).reduce((a, b) => ({...a, ...b}))
    };
  } else if (ShapeGuards.isArrayShape(shape)) {
    return toMappings(shape.Items);
  } else if (ShapeGuards.isNumberShape(shape)) {
    const {numberType} = Meta.get(shape, ['numberType']);
    return {
      type: typeof numberType === 'string' ? numberType : 'double',
    };
  } else if (ShapeGuards.isStringShape(shape)) {
    return {
      type: 'text'
    };
  } else if (ShapeGuards.isBoolShape(shape)) {
    return {
      type: 'boolean'
    };
  } else if (ShapeGuards.isTimestampShape(shape)) {
    return {
      type: 'date'
    };
  } else if (ShapeGuards.isBinaryShape(shape)) {
    return {
      type: 'binary'
    };
  } else if (ShapeGuards.isEnumShape(shape)) {
    return {
      type: 'keyword'
    };
  }
  throw new Error(`unsupported type: ${shape.Kind}`);
}
