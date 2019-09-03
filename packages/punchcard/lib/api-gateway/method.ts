import { RuntimeShape, Shape } from '../shape/shape';
import { StructShape } from '../shape/struct';

import { Client,  } from '../core/client';
import { Dependency } from '../core/dependency';
import { Integration } from './integration';
import { StatusCode, } from './request-response';
import { TypedMapping } from './variable';

export type MethodName = 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT';

export interface Method<R extends Dependency<any>, T extends StructShape<any>, U extends Responses, M extends MethodName> {
  integration: Integration<R>;
  request: {
    shape: T;
    mappings?: RequestMappings<T, M>;
  }

  responses: U;

  handle: (request: RuntimeShape<T>, runtimeContext: Client<R>) => Promise<Response<U, keyof U>>
}

export type MappingType<T extends Shape<any>> =
  T extends StructShape<infer S> ? {
    [K in keyof S]: MappingType<S[K]>;
  } :
  T extends Shape<any> ? TypedMapping<T> : never;

export type RequestMappings<S extends StructShape<any>, M extends MethodName> = M extends 'GET' ?
  // 'GET' methods require mappings for all properties since there is no body
  { [K in keyof S]-?: MappingType<S['shape'][K]>; } :
  { [K in keyof S]+?: MappingType<S['shape'][K]>; };

export type Responses =  {
  [StatusCode.Ok]: Shape<any>;
  [StatusCode.InternalError]: Shape<any>
} & {
  [S in StatusCode]?: Shape<any>;
};

export type ResponseShape<R extends Responses, S extends keyof R> = R[S] extends Shape<any> ? R[S] : never;

export interface Response<R extends Responses, S extends keyof R> {
  statusCode: S;
  payload: RuntimeShape<ResponseShape<R, S>>;
}

// TODO: Why do we need this function to enforce type safety .. ?
export function response<R extends Responses, S extends keyof R>(
    statusCode: S,
    payload: RuntimeShape<ResponseShape<R, S>>): Response<R, S> {
  return {
    statusCode,
    payload
  };
}
