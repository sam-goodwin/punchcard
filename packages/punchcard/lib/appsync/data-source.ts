import type * as appsync from '@aws-cdk/aws-appsync';

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
