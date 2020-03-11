import { ShapeOrRecord } from '@punchcard/shape';
import { Dependency } from '../core';
import { Function } from '../lambda';
import { GraphQL } from './types';

interface DataSource<T, U> {
  invoke(request: T): U;
}

export class FunctionDataSource<T extends ShapeOrRecord, U extends ShapeOrRecord, D extends Dependency | undefined> implements DataSource<GraphQL.Of<T>, GraphQL.Of<U>> {
  constructor(fn: Function<T, U, D>) {}

  public invoke(request: GraphQL.Of<T>): GraphQL.Of<U> {
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