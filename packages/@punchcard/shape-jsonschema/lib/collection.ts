import { Shape } from "@punchcard/shape/lib/shape";
import { JsonSchema, SchemaTag } from "./json-schema";

export interface ArraySchema<I extends JsonSchema = any> {
  type: 'array';
  items: I;
  uniqueItems?: false;
}
export interface SetSchema<I extends JsonSchema = any> {
  type: 'array';
  items: I;
  uniqueItems: true;
}
export interface MapSchema<T extends JsonSchema = any> {
  type: 'object';
  properties: {};
  allowAdditionalProperties: true;
  additionalProperties: T;
}

declare module '@punchcard/shape/lib/collection' {
  interface ArrayShape<T extends Shape> {
    [SchemaTag]: ArraySchema<T[SchemaTag]>;
  }
  interface SetShape<T extends Shape> {
    [SchemaTag]: SetSchema<T[SchemaTag]>;
  }
  interface MapShape<T extends Shape> {
    [SchemaTag]: MapSchema<T[SchemaTag]>;
  }
}