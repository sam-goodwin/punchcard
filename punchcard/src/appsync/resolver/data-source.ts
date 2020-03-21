// import { Shape } from '@punchcard/shape';
// import { Function } from '../../lambda';
import {GraphQL} from "../graphql";

// interface DataSource<T, U> {
//   invoke(request: T): GraphQL<U>;
// }

// export class FunctionDataSource<T extends Shape, U extends Shape> implements DataSource<T, U> {
//   constructor(public readonly fn: Function<T, U, any>) {
//     // no-op
//   }

//   public invoke(request: GraphQL.TypeOf<T>): GraphQL<GraphQL.TypeOf<U>> {
//     throw new Error("Method not implemented.");
//   }

//   public batchInvoke(request: GraphQL.List<GraphQL.TypeOf<T>>): GraphQL<GraphQL.List<GraphQL.TypeOf<U>>> {
//     throw new Error("Method not implemented.");
//   }
// }

export interface InvokeLambda {
  operation: "Invoke";
  payload: {
    arguments?: {
      [name: string]: GraphQL.Type;
    };
    field: string;
    source?: GraphQL.Type;
  };
  version: "2017-02-28";
}

export class LambdaHandler {
  //
}

/*
{
    "version": "2017-02-28",
    "operation": "Invoke",
    "payload": {
        "field": "relatedPosts",
        "source":  $utils.toJson($context.source)
    }
}
*/