import { Shape } from '@punchcard/shape';
import { JsonSchema } from './json-schema';

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
