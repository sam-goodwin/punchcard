import { array, BoolShape, NumericShape, Record, RecordType, ShapeOrRecord, string, StringShape, TimestampShape } from '@punchcard/shape';

import { JsonPath } from '@punchcard/shape-jsonpath';

import VTL = require('@punchcard/shape-velocity-template');

export interface Params {
  [name: string]: StringShape | NumericShape | BoolShape | TimestampShape;
}

export class Input<P extends Params | undefined, T extends RecordType> {
  public static of<P extends Params, T extends RecordType>(params: P, payload: T): Input<P, T> {
    return new Input(params, payload);
  }
  constructor(private readonly _params: P, private readonly _payload: T) {}

  public get request(): VTL.DSL<T> {

  }

  public body(): VTL.String {
    return null as any;
  }

  public param<Name extends keyof P>(name: Name): VTL.DSL<P[Name]> {
    return VTL.dsl(this._params[name]);
  }

  /**
   * $input.json
   */
  public json<U extends RecordType>(path: (path: JsonPath.Of<T>) => JsonPath.Of<U>): VTL.String {
    path(JsonPath.of(this._payload) as any);
    return null as any;
  }

  /**
   * $input.path
   */
  public path<U extends JsonPath.Object>(path: (path: JsonPath.Of<T>) => U): VTL.DSL<U[JsonPath.DataType]> {
    path(JsonPath.of(this._payload) as any);
    return null as any;
  }
}
