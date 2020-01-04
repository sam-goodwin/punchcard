import { Decorated } from "@punchcard/shape/lib/metadata";
import { SchemaTag } from "./json-schema";

interface StringSchemaConstraints {
  maxLength?: number;
  minLength?: number;
  pattern?: string;
}

export type StringSchema<C extends StringSchemaConstraints = {}> = {
  type: 'string';
  format?: string;
} & C;

export interface NumberSchema {
  type: 'number';
  format?: string;
}
export interface TimestampSchema {
  type: 'string';
  format: 'date-time';
}

type Assert<T, Is> = T extends Is ? T : never;

declare module '@punchcard/shape/lib/primitive' {
  interface StringShape {
    [SchemaTag]: this extends Decorated<StringShape, infer M> ?
      M extends StringSchemaConstraints ? StringSchema<M> : never :
      never
      ;
  }
  interface NumberShape {
    [SchemaTag]: NumberSchema;
  }
  interface TimestampShape {
    [SchemaTag]: TimestampSchema;
  }
}
