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
