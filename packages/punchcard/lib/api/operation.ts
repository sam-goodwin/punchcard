import { any, array, integer, Record, RecordType, ShapeOrRecord, string, Value } from '@punchcard/shape';
import { Client, Dependency } from '../core';

import { VTL } from '@punchcard/shape-velocity-template';

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

export class OperationBuilder {
  public input<Input extends ShapeOrRecord>(input: Input): OperationBuilder.Input<Input> {
    return new OperationBuilder.Input(input);
  }
}
export namespace OperationBuilder {
  export interface InputHandler<I extends ShapeOrRecord, O extends ShapeOrRecord, E extends Errors | undefined> {

  }
  export class Input<I extends ShapeOrRecord> {
    constructor(public readonly input: I) {}

    public transform<I2 extends VTL.Object>(f: (value: VTL.DSL<I>) => I2): MappedInput<I, VTL.Object.Shape<I2>> {
      const mapped = f(VTL.dsl(this.input));
      const mappedShape = mapped[VTL.ExpressionNode][VTL.ExpressionType];
      return new MappedInput(this.input, mappedShape);
    }

    public proxy<O extends ShapeOrRecord, E extends Errors | undefined>(
      fn: (request: VTL.DSL<I>) => InputHandler<I, O, E>):
        OriginalOutput<I, O, E> {

      return null as any;
    }

    public execute<O extends ShapeOrRecord, E extends Errors = {}, D extends Dependency | undefined = undefined>(
        props: RunProps<O, E, D>, handler: CallHandler<I, O, E, D>):
          OriginalOutput<I, O, E> {
      return null as any;
    }
  }

  export class MappedInput<I extends ShapeOrRecord, I2 extends ShapeOrRecord> {
    constructor(public readonly input: I, public readonly mappedInput: I2) {}

    /**
     * Run some code to handle the request.
     *
     * @param props configuration of the handler
     * @param handler implementation of the handler.
     */
    public execute<O extends ShapeOrRecord, E extends Errors = {}, D extends Dependency | undefined = undefined>(
        props: RunProps<O, E, D>, handler: CallHandler<I2, O, E, D>):
          OriginalOutput<I, O, E> {
      return null as any;
    }
  }

  export const isOutput = Symbol.for('punchcard/lib/api.OperationBuilder.isOutput');
  export class Output<T extends ShapeOrRecord, O extends ShapeOrRecord, E extends Errors | undefined> {
    readonly [isOutput]: true = true;

    constructor(public readonly input: T, public readonly output: O, public readonly errors: E) {}
  }
  export class OriginalOutput<I extends ShapeOrRecord, O extends ShapeOrRecord, E extends Errors | undefined> extends Output<I, O, E> {
    public transform<O2 extends VTL.Object>(f: (value: VTL.DSL<O>) => O2): MappedOutput<I, O, VTL.Object.Shape<O2>, E> {
      const mapped = f(VTL.dsl(this.output));
      const mappedShape = mapped[VTL.ExpressionNode][VTL.ExpressionType];
      return new MappedOutput(this.input, this.output, mappedShape, this.errors);
    }
  }
  export class MappedOutput<I extends ShapeOrRecord, O extends ShapeOrRecord, O2 extends ShapeOrRecord, E extends Errors | undefined> extends Output<I, O2, E> {
    constructor(input: I, public readonly originalOutput: O, public readonly mappedOutput: O2, errors: E) {
      super(input, mappedOutput, errors);
    }
  }
}

const IsIntegration = Symbol.for('punchcard/lib/api.Integration');
export interface Integration<T extends ShapeOrRecord, U extends ShapeOrRecord, E extends Errors | undefined> {
  [IsIntegration]: true;
}

export interface CallProps<T extends ShapeOrRecord, U extends ShapeOrRecord, E extends Errors, D extends Dependency | undefined>
    extends OperationProps<T, U, E> {
  endpoint: Endpoint;
  depends?: D;
}

export type CallHandler<T extends ShapeOrRecord, U extends ShapeOrRecord, E extends Errors, D extends Dependency | undefined> = (request: Value.Of<T>, client: Client<D>) => Promise<Response<U, E>>;

export class Call<T extends ShapeOrRecord, U extends ShapeOrRecord, E extends Errors, D extends Dependency | undefined> implements Integration<T, U, E> {
  public readonly [IsIntegration] = true;
  constructor(props: CallProps<T, U, E, D>, handler: CallHandler<T, U, E, D>) {
    // todo
  }

  public call(value: VTL.DSL<T>): OperationBuilder.OriginalOutput<T, U, E> {
    return null as any;
  }
}

// https://aws.amazon.com/blogs/compute/using-amazon-api-gateway-as-a-proxy-for-dynamodb/