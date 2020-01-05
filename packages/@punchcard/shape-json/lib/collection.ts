import { Shape } from "@punchcard/shape/lib/shape";
import { JsonSchema } from "./json-schema";

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
    [JsonSchema.Tag]: ArraySchema<T[JsonSchema.Tag]>;
  }
  interface SetShape<T extends Shape> {
    [JsonSchema.Tag]: SetSchema<T[JsonSchema.Tag]>;
  }
  interface MapShape<T extends Shape> {
    [JsonSchema.Tag]: MapSchema<T[JsonSchema.Tag]>;
  }
}