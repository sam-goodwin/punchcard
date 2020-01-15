import { ClassShape, ClassType } from '@punchcard/shape';
import { Shape } from '@punchcard/shape/lib/shape';
import { ArraySchema, MapSchema, SetSchema } from './collection';
import { ObjectSchema } from './object';
import { AnySchema, BinarySchema, BoolSchema, NumberSchema, StringSchema, TimestampSchema } from './primitive';
import { ToJsonSchemaVisitor } from './visitor';

export type JsonSchema =
  | AnySchema
  | BinarySchema<any>
  | BoolSchema
  | MapSchema<any>
  | SetSchema<any>
  | ArraySchema<any>
  | ObjectSchema<any>
  | NumberSchema
  | TimestampSchema
  | StringSchema
  ;

export namespace JsonSchema {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-json.Tag');

  export type Of<T extends {[Tag]: any} | ClassType> =
    T extends { [Tag]: infer J } ? J :
    T extends ClassType ? ClassShape<T> extends { [Tag]: infer J } ? J : never :
    never
    ;

  export function of<T extends Shape | ClassType>(item: T): JsonSchema.Of<T> {
    return (Shape.of(item) as any).visit(new ToJsonSchemaVisitor());
  }
}

declare module '@punchcard/shape/lib/shape' {
  interface Shape {
    [JsonSchema.Tag]: JsonSchema;
  }
}
