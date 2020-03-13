import type * as appsync from '@aws-cdk/aws-appsync';
import type * as cdk from '@aws-cdk/core';

import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Resource } from '../core/resource';

export interface GraphQLApiProps {
  //
}

export class GraphQLApi implements Resource<appsync.GraphQLApi> {
  public readonly resource: Build<appsync.GraphQLApi>;

  constructor(scope: Build<cdk.Construct>, id: string) {
    this.resource = CDK.chain(({appsync}) => scope.map(scope => {
      return new appsync.GraphQLApi(scope, id, {
      } as any);
    }));
  }
}