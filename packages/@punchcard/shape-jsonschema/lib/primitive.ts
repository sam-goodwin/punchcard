import { Meta } from "@punchcard/shape/lib/metadata";
import { JsonSchema } from "./json-schema";

export interface BoolSchema {
  type: 'boolean';
}

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

export interface TimestampSchema {
  type: 'string';
  format: 'date-time';
}

declare module '@punchcard/shape/lib/primitive' {
  interface BoolShape {
    [JsonSchema.Tag]: BoolSchema;
  }
  interface StringShape {
    [JsonSchema.Tag]: StringSchema<Meta.GetData<this>>;
  }
  interface NumberShape {
    [JsonSchema.Tag]: NumberSchema<Meta.GetData<this>>;
  }
  interface TimestampShape {
    [JsonSchema.Tag]: TimestampSchema;
  }
}
