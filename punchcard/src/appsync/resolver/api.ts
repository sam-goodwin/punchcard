// import type * as appsync from '@aws-cdk/aws-appsync';
// import type * as cdk from '@aws-cdk/core';

// import {  RecordMembers, RecordShape, Shape } from '@punchcard/shape';
// import { Resolved, Resolver, $api } from '../intepreter/resolver';
// import { GraphQL } from '../types';
import { Construct } from '../../core/construct';

// export interface GraphQLApiProps {
//   //
// }

// export class GraphQLApi implements Resource<appsync.GraphQLApi> {
//   public readonly resource: Build<appsync.GraphQLApi>;

//   constructor(scope: Build<cdk.Construct>, id: string) {
//     this.resource = CDK.chain(({appsync}) => scope.map(scope => {
//       return new appsync.GraphQLApi(scope, id, {
//       } as any);
//     }));
//   }
// }

// import Lambda = require('../../lambda');

export class Api extends Construct {
  public readonly api = this.scope.map(_scope => {
    
  })
}