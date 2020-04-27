import { ArrayShape, BinaryShape, DynamicShape, IntegerShape, MapShape, Meta, NothingShape, NumberShape, RecordShape, SetShape, StringShape, UnionShape } from '@punchcard/shape';
import { Shape } from '@punchcard/shape/lib/shape';
import { ToJsonSchemaVisitor } from './visitor';

export type JsonSchema =
  | AnySchema
  | ArraySchema<any>
  | BinarySchema<any>
  | BoolSchema
  | IntegerSchema
  | MapSchema<any>
  | NumberSchema
  | ObjectSchema<any>
  | SetSchema<any>
  | StringSchema
  | TimestampSchema
  | OneOf<Shape[]>
  ;

export namespace JsonSchema {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-json.Tag');

  export type Of<T extends Shape> =
    T extends BinaryShape ? BinarySchema<Meta.GetData<T>> :
    T extends BoolSchema ? BoolSchema :
    T extends DynamicShape<any> ? AnySchema :
    T extends IntegerShape ? IntegerSchema<Meta.GetData<T>> :
    T extends NothingShape ? NothingSchema :
    T extends NumberShape ? NumberSchema<Meta.GetData<T>> :
    T extends StringShape ? StringSchema<Meta.GetData<T>> :

    T extends ArrayShape<infer I> ? ArraySchema<I> :
    T extends MapShape<infer V> ? MapSchema<V> :
    T extends SetShape<infer I> ? SetSchema<I> :
    T extends RecordShape<infer M> ? ObjectSchema<{
      [m in keyof M]: Of<M[m]>;
    }> :
    T extends UnionShape<infer U> ?
      U extends 1 ? {
        [i in Extract<keyof U, number>]: Of<U[i]>
      }[1] :
      NothingShape extends Extract<U[Extract<keyof U, number>], NothingShape> ?
        U['length'] extends 1 ? NothingSchema :
        U['length'] extends 2 ?
          Exclude<{
            [i in Extract<keyof U, number>]: Of<U[i]>;
          }[Extract<keyof U, number>], NothingSchema> :
        OneOf<U> :
      OneOf<U> :

    T extends { [Tag]: infer J } ? J :
    never
    ;

  export function of<T extends Shape>(item: T): JsonSchema.Of<T> {
    return item.visit(new ToJsonSchemaVisitor() as any, undefined);
  }
}

export interface AnySchema {
  type: {};
}
export interface BoolSchema {
  type: 'boolean';
}

export interface BinarySchemaConstraints {
  maxLength?: number;
  minLength?: number;
}
export type BinarySchema<C extends BinarySchemaConstraints> = {
  type: 'string';
  format: 'base64';
} & Pick<C, 'maxLength' | 'minLength'>;

export interface StringSchemaConstraints {
  maxLength?: number;
  minLength?: number;
  pattern?: string;
}
export type StringSchema<C extends StringSchemaConstraints = {}> = {
  type: 'string';
  // format?: string; // TODO: should format always be derived from the type of a Shape, or can a decorator influence it?
} & Pick<C, 'maxLength' | 'minLength' | 'pattern'>;

export interface NumberSchemaConstraints {
  minimum?: number;
  // TODO: this is the JSON Schema draft 4 version as that is what API GW supports. How to support different versions?
  exclusiveMinimum?: boolean;
  maximum?: number;
  exclusiveMaximum?: boolean;
  multipleOf?: number;
}
export type NumberSchema<C extends NumberSchemaConstraints = {}> = {
  type: 'number';
  format?: string;
} & Pick<C, 'minimum' | 'maximum' | 'exclusiveMinimum' | 'exclusiveMaximum' | 'multipleOf'>;

export type IntegerSchema<C extends NumberSchemaConstraints = {}> = {
  type: 'integer';
  format?: string;
} & Pick<C, 'minimum' | 'maximum' | 'exclusiveMinimum' | 'exclusiveMaximum' | 'multipleOf'>;

export interface TimestampSchema {
  type: 'string';
  format: 'date-time';
}
export interface NothingSchema {
  type: 'null'
}
export interface ArraySchema<I extends Shape = any> {
  type: 'array';
  items: JsonSchema.Of<I>;
  uniqueItems?: false;
}
export interface SetSchema<I extends Shape = any> {
  type: 'array';
  items: JsonSchema.Of<I>;
  uniqueItems: true;
}
export interface MapSchema<T extends Shape = any> {
  type: 'object';
  properties: {};
  allowAdditionalProperties: true;
  additionalProperties: JsonSchema.Of<T>;
}
export interface ObjectSchemaProperties {
  [p: string]: any;
}
export interface ObjectSchema<P extends ObjectSchemaProperties> {
  type: 'object';
  properties: P;
  required: string[];
}

export interface OneOf<T extends ArrayLike<Shape>> {
  oneOf: {
    [i in Extract<keyof T, number>]: JsonSchema.Of<T[i]>;
  } & {
    length: T['length']
  };
}
