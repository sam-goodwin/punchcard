import { Shape } from "@punchcard/shape/lib/shape";
import { JsonSchema, NumberSchema, ObjectSchema, StringSchema } from "./json-schema";
import { ToJsonSchemaVisitor } from "./visitor";

const Schema = Symbol.for('@punchcard/shape-jsonschema');

declare module '@punchcard/shape/lib/shape' {
  interface Shape {
    [Schema]: JsonSchema;
  }
}
declare module '@punchcard/shape/lib/primitive' {
  interface StringShape {
    [Schema]: StringSchema;
  }
  interface NumberShape {
    [Schema]: NumberSchema;
  }
}
declare module '@punchcard/shape/lib/class' {
  interface ClassShape<C extends ClassType> {
    [Schema]: ObjectSchema<{
      [p in keyof this['Members']]: ToJsonSchema<this['Members'][p]['Type']>
    }>;
  }
}

export type ToJsonSchema<T extends {[Schema]: any}> = T[typeof Schema] extends JsonSchema ? T[typeof Schema] : never;

export function toJsonSchema<T extends Shape>(item: T): ToJsonSchema<T> {
  return item.visit(new ToJsonSchemaVisitor()) as any;
}