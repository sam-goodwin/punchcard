import type * as appsync from '@aws-cdk/aws-appsync';
import type * as cdk from '@aws-cdk/core';

export enum DataSourceType {
  AMAZON_DYNAMODB = 'AMAZON_DYNAMODB',
  AMAZON_ELASTICSEARCH = 'AMAZON_ELASTICSEARCH',
  AWS_LAMBDA = 'AWS_LAMBDA',
  HTTP = 'HTTP',
  NONE = 'NONE',
  RELATIONAL_DATABASE = 'RELATIONAL_DATABASE',
}

export interface DataSourceProps extends Omit<appsync.CfnDataSourceProps,
  | 'apiId'
  | 'name'
> {}


export type DataSourceBindCallback = (scope: cdk.Construct, id: string) => DataSourceProps;