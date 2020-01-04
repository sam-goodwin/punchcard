import { SchemaTag } from "./json-schema";

export interface StringSchema {
  type: 'string';
  format?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
}
export interface NumberSchema {
  type: 'number';
  format?: string;
}
export interface TimestampSchema {
  type: 'string';
  format: 'date-time';
}

declare module '@punchcard/shape/lib/primitive' {
  interface StringShape {
    [SchemaTag]: StringSchema;
  }
  interface NumberShape {
    [SchemaTag]: NumberSchema;
  }
  interface TimestampShape {
    [SchemaTag]: TimestampSchema;
  }
}
