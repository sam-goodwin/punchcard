import { Shape } from '@punchcard/shape/lib/shape';
import { ObjectSchema } from './class';
import { ArraySchema, MapSchema, SetSchema } from './collection';
import { NumberSchema, StringSchema, TimestampSchema } from './primitive';
import { ToJsonSchemaVisitor } from './visitor';

export type JsonSchema =
  | MapSchema<any>
  | SetSchema<any>
  | ArraySchema<any>
  | ObjectSchema<any>
  | NumberSchema
  | TimestampSchema
  | StringSchema
  ;

export type SchemaTag = typeof SchemaTag;
export const SchemaTag = Symbol.for('@punchcard/shape-jsonschema');

declare module '@punchcard/shape/lib/shape' {
  interface Shape {
    [SchemaTag]: JsonSchema;
  }
}

export type ToJsonSchema<T extends {[SchemaTag]: any}> = T[SchemaTag] extends JsonSchema ? T[SchemaTag] : never;

export function toJsonSchema<T extends Shape>(item: T): ToJsonSchema<T> {
  return item.visit(new ToJsonSchemaVisitor() as any) as any;
}
