import * as AWS from 'aws-sdk';

import * as elasticsearch from 'elasticsearch';

import type * as cloudformation from '@aws-cdk/aws-cloudformation';
import type * as ec2 from '@aws-cdk/aws-ec2';
import type * as es from '@aws-cdk/aws-elasticsearch';
import type * as iam from '@aws-cdk/aws-iam';
import type * as kms from '@aws-cdk/aws-kms';

import { CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse } from 'aws-lambda';

import { any, AnyShape, TypeShape } from '@punchcard/shape';

import { Dependency, Duration } from '../core';
import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Construct, Scope } from '../core/construct';
import { Resource } from '../core/resource';
import { Run } from '../core/run';
import * as Lambda from '../lambda';
import { Index, IndexProps, _ID } from './es-index';

export enum Version {
  V7_4 = '7.4',
  V7_1 = '7.1',
  V6_8 = '6.8',
  V6_7 = '6.7',
  V6_5 = '6.5',
  V6_4 = '6.4',
  V6_3 = '6.3',
  V6_2 = '6.2',
  V6_0 = '6.0',
  V5_6 = '5.6',
  V5_5 = '5.5',
  V5_3 = '5.3',
  V5_1 = '5.1',
  V2_3 = '2.3',
  V1_5 = '1.5',
}

export interface DomainProps {
  domainName?: string,
  version: Version;
  /**
   * @default true
   */
  encryptAtRest?: boolean | Build<kms.IKey>,
  /**
   * @default true
   */
  nodeToNodeEncryptionOptions?: boolean,
  vpcOptions?: Build<{
    vpc: ec2.Vpc;
    vpcSubnets: ec2.SubnetSelection;
  }>

  elasticsearchClusterConfig: es.CfnDomain.ElasticsearchClusterConfigProperty;

  ebsOptions?: {
    iops: number;
    volumeType: EbsVolumeType;
    volumeSize: number;
  };

  /**
   * @see https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-createupdatedomains.html#es-createdomain-configure-access-policies
   */
  accessPolicies?: Build<iam.PolicyDocument>;
}

/**
 * @see https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-volume-types.html
 */
export enum EbsVolumeType {
  gp2 = 'gp2',
  io1 = 'io1',
  st1 = 'st1',
  sc1 = 'sc1',
}

export class Domain extends Construct implements Resource<es.CfnDomain> {
  public readonly resource: Build<es.CfnDomain>;
  public readonly adminFunction: Lambda.Function<
    AnyShape,
    AnyShape,
    Dependency<elasticsearch.Client>
  >;
  public readonly domain: Build<es.CfnDomain>;
  public readonly key: Build<kms.IKey | undefined>;
  public readonly indexResourceProvider: Build<cloudformation.CustomResourceProvider>;

  constructor(scope: Scope, id: string, props: DomainProps) {
    super(scope, id);
    const keyAndDomain = Build.concat(
      CDK,
      Scope.resolve(scope),
      props.vpcOptions || Build.of(undefined),
      props.accessPolicies || Build.of(undefined)
    ).map(([
      {core, elasticSearch, iam, kms},
      scope,
      vpcOptions,
      accessPolicies,
    ]) => {
      scope = new core.Construct(scope, id);
      const key =
        Build.isBuild(props.encryptAtRest) ? Build.resolve(props.encryptAtRest) :
        props.encryptAtRest === true ? new kms.Key(scope, 'Key') :
        undefined
      ;

      const domain = new elasticSearch.CfnDomain(scope as any, id, {
        domainName: props.domainName,
        elasticsearchVersion: props.version,
        accessPolicies,
        encryptionAtRestOptions: key === undefined ? undefined : {
          enabled: true,
          kmsKeyId: key!.keyId,
        },
        nodeToNodeEncryptionOptions: {
          enabled: props.nodeToNodeEncryptionOptions === true
        },
        ebsOptions: props.ebsOptions ? {
          ebsEnabled: true,
          iops: props.ebsOptions.iops || 1000,
          volumeSize: props.ebsOptions.volumeSize,
          volumeType: props.ebsOptions.volumeType
        } : undefined,
        elasticsearchClusterConfig: props.elasticsearchClusterConfig,
        vpcOptions: vpcOptions !== undefined ? {
          subnetIds: vpcOptions.vpcSubnets.subnets!.map(_ => _.subnetId)
        } : undefined,
      });

      return {
        key,
        domain
      };
    });

    this.resource = keyAndDomain.map(_ => _.domain);
    this.domain = this.resource;
    this.key = keyAndDomain.map(_ => _.key);

    this.adminFunction = new Lambda.Function(this, 'IndexManager', {
      depends: this.adminAccess(),
      request: any,
      response: any,
      timeout: Duration.minutes(10),
      functionProps: props.vpcOptions?.map(({vpc, vpcSubnets}) => ({
        vpc,
        vpcSubnets
      }))
    }, async (event: CloudFormationCustomResourceEvent, es, context) => {
      console.log(event);
      try {
        if (event.RequestType === 'Create') {
          console.log('creating index', event);
          const request: elasticsearch.IndicesCreateParams = {
            index: event.ResourceProperties.IndexName as string,
            body: {
              mappings: event.ResourceProperties.Mappings,
              settings: {
                index: {
                  number_of_shards: parseInt(event.ResourceProperties.Settings.number_of_shards, 10),
                  number_of_replicas: parseInt(event.ResourceProperties.Settings.number_of_replicas, 10),
                  auto_expand_replicas: event.ResourceProperties.Settings.auto_expand_replicas
                }
              }
            }
          };
          console.log('request', request);
          const response = await es.indices.create(request);
          console.log('response', response);
        } else if (event.RequestType === 'Update') {
          console.log('update', event);
          // TODO: re-index?
          // throw new Error(`Update index is not supported`);
        } else if (event.RequestType === 'Delete') {
          console.log('delete', event);
          await es.indices.delete({
            index: event.ResourceProperties.IndexName as string,
          });
        }
      } catch (err) {
        await cfnResponse(event, context, 'FAILED', { Error: err });
        throw err;
      }
      await cfnResponse(event, context, 'SUCCESS', {
        indexName: event.ResourceProperties.IndexName
      });
    });

    this.indexResourceProvider = Build.concat(
      CDK,
      this.adminFunction.resource,
    ).map(([{cloudformation}, onEventHandler]) =>
      cloudformation.CustomResourceProvider.fromLambda(onEventHandler));
  }

  private _client: Record<string, elasticsearch.Client | undefined> = {};

  private domainClient(host: string): elasticsearch.Client {
    if (typeof host !== 'string') {
      throw new Error(`expected domain host to be a string, got ${typeof host}`);
    }
    if (!this._client[host]) {
      this._client[host] = new elasticsearch.Client({
        host,
        connectionClass: require('http-aws-es') as any,
        amazonES: {
          region: process.env.AWS_REGION!,
          // accessKey: process.env.AWS_ACCESS_KEY_ID!,
          // secretKey: process.env.AWS_SECRET_ACCESS_KEY,
          credentials: new AWS.Credentials({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            sessionToken: process.env.AWS_SESSION_TOKEN!
          })
        }
      } as any);
    }
    return this._client[host]!;
  }

  public adminAccess(): Dependency<elasticsearch.Client> {
    return this.access({
      actions: ['es:*'],
    });
  }

  public access(props: {
    actions: string[];
    paths?: string[];
  }): Dependency<elasticsearch.Client> {
    const self = this;
    return {
      bootstrap: Run.lazy(() => async (namespace) => self.domainClient(namespace.get('domainEndpoint'))),
      install: CDK.chain(({iam}) => this.resource.map(domain => (namespace, grantable) => {
        namespace.set('domainEndpoint', domain.getAtt('DomainEndpoint').toString());
        grantable.grantPrincipal.addToPolicy(new iam.PolicyStatement({
          actions: props.actions,
          effect: iam.Effect.ALLOW,
          resources: (props.paths || ['*']).map(path => `${domain.attrArn}/${path}`)
        }));
      }))
    };
  }

  public addIndex<T extends TypeShape, ID extends keyof T['Members']>(props: IndexProps<T, ID>): Index<T, ID> {
    return new Index(this, props.indexName, this, props);
  }
}

import * as https from 'https';
import * as url from 'url';

function cfnResponse(
  event: any,
  context: any,
  responseStatus: 'SUCCESS' | 'FAILED',
  responseData?: any,
  physicalResourceId?: string,
  noEcho?: boolean
) {
  return new Promise((resolve, reject) => {
    const responseBody = JSON.stringify({
      Status: responseStatus,
      Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
      PhysicalResourceId: physicalResourceId || context.logStreamName,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      NoEcho: noEcho || false,
      Data: responseData
    });

    console.log("Response body:\n", responseBody);

    const parsedUrl = url.parse(event.ResponseURL);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.path,
      method: "PUT",
      headers: {
        "content-type": "",
        "content-length": responseBody.length
      }
    };

    const request = https.request(options, (response) => {
      console.log("Status code: " + response.statusCode);
      console.log("Status message: " + response.statusMessage);
      resolve(response);
    });

    request.on("error", (error) => {
      console.error("send(..) failed executing https.request(..): ", error);
      reject(error);
    });

    request.write(responseBody);
    request.end();
  });
}

