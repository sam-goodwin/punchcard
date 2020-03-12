import { Function } from '../lambda';
import { GraphQL } from './types';

interface DataSource<T, U> {
  invoke(request: T): GraphQL<U>;
}

export class FunctionDataSource<T extends GraphQL.Type, U extends GraphQL.Type> implements DataSource<T, U> {
  constructor(public readonly fn: Function<GraphQL.ShapeOf<T>, GraphQL.ShapeOf<U>, any>) {
    // no-op
  }

  public invoke(request: T): GraphQL<U> {
    throw new Error("Method not implemented.");
  }

  public batchInvoke(request: GraphQL.List<T>): GraphQL<GraphQL.List<U>> {
    throw new Error("Method not implemented.");
  }
}

export interface InvokeLambda {
  version: '2017-02-28';
  operation: 'Invoke';
  payload: {
    field: string;
    arguments?: {
      [name: string]: GraphQL.Type
    };
    source?: GraphQL.Type;
  }
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