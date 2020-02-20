import { any, array, integer, Record, RecordType, ShapeOrRecord, string, Value } from '@punchcard/shape';
import { Client, Dependency } from '../core';

import VTL = require('@punchcard/shape-velocity-template');

// references for setting up methods
// https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-settings-method-request.html#setup-method-add-http-method
// https://aws.amazon.com/blogs/compute/how-to-remove-boilerplate-validation-logic-in-your-rest-apis-with-amazon-api-gateway-request-validation/

export interface Errors {
  [errorName: string]: RecordType;
}

export const isOk = Symbol.for('@punchcard/shape-smithy.Ok');
export const isError = Symbol.for('@punchcard/shape-smithy.Error');
export class OkResponse<T extends ShapeOrRecord> {
  public readonly [isOk]: true = true;
  constructor(public readonly value: Value.Of<T>) {}
}
export function Ok<T extends ShapeOrRecord>(value: Value.Of<T>): OkResponse<T> {
  return new OkResponse(value);
}
export class FailResponse<E extends Errors, Tag extends keyof E> {
  public readonly [isError]: true = true;
  constructor(public readonly tag: Tag, public readonly value: Value.Of<E[Tag]>) {}
}
export function Fail<E extends Errors, Tag extends keyof E>(tag: Tag, value: Value.Of<E[Tag]>) {
  return new FailResponse(tag, value);
}

export type Response<T extends ShapeOrRecord, E extends Errors> = OkResponse<T> | FailResponse<E, keyof E>;

export interface OperationProps<T extends ShapeOrRecord, U extends ShapeOrRecord, E extends Errors | undefined = undefined> {
  input: T;
  output: U;
  errors?: E;
}

export class Operation<T extends ShapeOrRecord = any, U extends ShapeOrRecord = any, E extends Errors | undefined = any> {
  public readonly request: T;
  public readonly response: U;
  public readonly errors: E;

  constructor(props: OperationProps<T, U, E>, public readonly integration: Integration<T, U, E>) {
    this.request = (props.input || any) as T;
    this.response = (props.output || any) as U;
    this.errors = (props.errors || []) as E;
  }
}

export interface RunProps<O extends ShapeOrRecord, E extends Errors | undefined, D extends Dependency | undefined> {
  /**
   * Override the endpoint on which the code runs.
   *
   * @default - the default endpoint of the service
   */
  endpoint?: Endpoint,
  output: O;
  errors?: E;
  depends?: D
}

export class Endpoint {}

const IntegrationType = Symbol.for('punchcard/lib/api/operation.IntegrationType');
export interface Integration<T extends ShapeOrRecord, U extends ShapeOrRecord, E extends Errors | undefined> {
  [IntegrationType]: string;
}

export interface HandlerProps<T extends ShapeOrRecord, U extends ShapeOrRecord, E extends Errors, D extends Dependency | undefined>
    extends OperationProps<T, U, E> {
  endpoint: Endpoint;
  depends?: D;
}

export type HandlerFunction<T extends ShapeOrRecord, U extends ShapeOrRecord, E extends Errors, D extends Dependency | undefined> = (request: Value.Of<T>, client: Client<D>) => Promise<Response<U, E>>;

export class Handler<T extends ShapeOrRecord, U extends ShapeOrRecord, E extends Errors, D extends Dependency | undefined> {
  public readonly [IntegrationType] = true;
  constructor(props: HandlerProps<T, U, E, D>, handler: HandlerFunction<T, U, E, D>) {
    // todo
  }

  public call(value: VTL.DSL<T>): VTL.DSL<U> {
    return null as any;
  }
}

export class Call<T extends ShapeOrRecord = any, U extends ShapeOrRecord = any, E extends Errors = any> implements Integration<T, U, E> {
  public readonly [IntegrationType]: 'call' = 'call';
  constructor() {
    
  }

  public get data(): VTL.DSL<U> {
    return 'todo' as any;
  }
}
export function isCall(a: any): a is Call {
  return a[IntegrationType] === 'call';
}

// https://aws.amazon.com/blogs/compute/using-amazon-api-gateway-as-a-proxy-for-dynamodb/