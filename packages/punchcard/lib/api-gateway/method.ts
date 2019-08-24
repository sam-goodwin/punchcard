import { RuntimeShape, RuntimeType, Shape } from '../shape/shape';
import { StructType, Type } from '../shape/types';

import { Client, Dependency } from '../dependency';
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
  T extends Type<any> ? TypedMapping<T> : never;

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

export interface Response<R extends Responses, S extends keyof R> {
  statusCode: S;
  payload: RuntimeType<R[S]>;
}

// TODO: Why do we need this function to enforce type safety .. ?
export function response<R extends Responses, S extends keyof R>(
    statusCode: S,
    payload: RuntimeType<R[S]>): Response<R, S> {
  return {
    statusCode,
    payload
  };
}
