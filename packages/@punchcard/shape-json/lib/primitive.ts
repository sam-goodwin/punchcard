import { Meta } from "@punchcard/shape/lib/metadata";
import { SchemaTag } from "./json-schema";

interface StringSchemaConstraints {
  maxLength?: number;
  minLength?: number;
  pattern?: string | undefined;
}

export type StringSchema<C extends StringSchemaConstraints = {}> = {
  type: 'string';
  format?: string;
} & Pick<C, 'maxLength' | 'minLength' | 'pattern'>;

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
    [SchemaTag]: StringSchema<Meta.Get<this, {}>>;
  }
  interface NumberShape {
    [SchemaTag]: NumberSchema;
  }
  interface TimestampShape {
    [SchemaTag]: TimestampSchema;
  }
}
