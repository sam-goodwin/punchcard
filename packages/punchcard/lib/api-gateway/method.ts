import { RuntimeShape, Shape } from '../shape/shape';
import { StructType, Type } from '../shape/types';

import { Client, Dependency } from '../compute';
import { Integration } from './integration';
import { StatusCode, } from './request-response';
import { TypedMapping } from './variable';

export type MethodName = 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT';

export interface Method<R extends Dependency<any>, T extends Shape, U extends Responses, M extends MethodName> {
  integration: Integration<R>;
  request: {
    shape: T;
    mappings?: RequestMappings<T, M>;
  }

  responses: U;

  handle: (request: RuntimeShape<T>, runtimeContext: Client<R>) => Promise<Response<U, keyof U>>
}

export type MappingType<T extends Type<any>> =
  T extends StructType<infer S> ? {
    [K in keyof S]: MappingType<S[K]>;
  } :
  T extends Type<infer V> ? TypedMapping<T, V> : never;

export type RequestMappings<S extends Shape, M extends MethodName> = M extends 'GET' ?
  // 'GET' methods require mappings for all properties since there is no body
  { [K in keyof S]-?: MappingType<S[K]>; } :
  { [K in keyof S]+?: MappingType<S[K]>; };

export type Responses =  {
  [StatusCode.Ok]: Type<any>;
  [StatusCode.InternalError]: Type<any>
} & {
  [S in StatusCode]?: Type<any>;
};

// TODO: Why do we need to use GetShape when all values of Responses is a Shape????
type GetShape<T> = T extends Type<infer V> ? V : never;
export interface Response<R extends Responses, S extends keyof R> {
  statusCode: S;
  payload: GetShape<R[S]>;
}

// TODO: Why do we need this function to enforce type safety .. ?
export function response<R extends Responses, S extends keyof R>(
    statusCode: S,
    payload: GetShape<R[S]>): Response<R, S> {
  return {
    statusCode,
    payload
  };
}
