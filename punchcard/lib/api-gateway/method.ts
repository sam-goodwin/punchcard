import { RecordShape, RecordType, Shape, Value } from '@punchcard/shape';
import { Client,  } from '../core/client';
import { Dependency } from '../core/dependency';
import { Integration } from './integration';
import { StatusCode, } from './request-response';
import { TypedMapping } from './variable';

export type MethodName = 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT';

export interface Method<R extends Dependency<any>, T extends RecordType, U extends Responses, M extends MethodName> {
  integration: Integration<R>;
  request: {
    shape: T;
    mappings?: RequestMappings<T, M>;
  }

  responses: U;

  handle: (request: Value.Of<T>, runtimeContext: Client<R>) => Promise<Response<U, keyof U>>
}

export type MappingType<T> =
  T extends Shape ? TypedMapping<T> :
  T extends RecordType<infer M> ? {
    [K in keyof M]: MappingType<M[K]> ;
  } :
  never;

export type RequestMappings<S extends RecordType, M extends MethodName> = M extends 'GET' ?
  // 'GET' methods require mappings for all properties since there is no body
  { [K in keyof S['Members']]-?: MappingType<S['Members'][K]>; } :
  { [K in keyof S['Members']]+?: MappingType<S['Members'][K]>; };

export type Responses =  {
  [StatusCode.Ok]: Shape;
  [StatusCode.InternalError]: Shape
} & {
  [S in StatusCode]?: Shape;
};

export type ResponseShape<R extends Responses, S extends keyof R> = R[S] extends Shape ? R[S] : never;

export interface Response<R extends Responses, S extends keyof R> {
  statusCode: S;
  payload: Value.Of<ResponseShape<R, S>>;
}

// TODO: Why do we need this function to enforce type safety .. ?
export function response<R extends Responses, S extends keyof R>(
    statusCode: S,
    payload: Value.Of<ResponseShape<R, S>>): Response<R, S> {
  return {
    statusCode,
    payload
  };
}
