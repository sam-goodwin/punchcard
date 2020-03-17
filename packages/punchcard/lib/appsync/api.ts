import type * as appsync from '@aws-cdk/aws-appsync';
import type * as cdk from '@aws-cdk/core';

import { RecordMembers, Shape } from '@punchcard/shape';
import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Resource } from '../core/resource';
import { Resolved, Resolver } from './resolver/resolver';
import { GraphQL } from './types';

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


export interface Query {}
export interface Queries {
  [queryName: string]: Resolved<Shape>;
}

export interface Mutation {}
export interface Mutations {
  [mutationName: string]: Resolved<Shape>;
}

export function resolver<Args extends RecordMembers, Ret extends Shape>(args: Args, returns: Ret | ((returns?: undefined) => Ret)): Resolver<{
  [a in keyof Args]: GraphQL.TypeOf<Args[a]>;
}, Ret> {
  throw new Error();
}

export interface ApiProps<Q extends Queries, M extends Mutation | undefined = undefined> {
  query: Q;
  mutation?: M;
}

export class Api<Q extends Queries, M extends Mutations | undefined> {
  public readonly query: Q;
  public readonly mutation: M;
  constructor(props: ApiProps<Q, M>) {
    this.query = props.query;
    this.mutation = props.mutation!;
  }
}