export type JsonSchema = NumberSchema | StringSchema | TimestampSchema | TimestampSchema | ObjectSchema<any>;

export interface StringSchema {
  type: 'string';
  format?: string;
}
export interface NumberSchema {
  type: 'number';
  format?: string;
}
export interface TimestampSchema {
  type: 'string';
  format: 'date-time';
}
export interface ObjectSchema<P extends {[p in string]: JsonSchema}> {
  type: 'object';
  properties: P;
}