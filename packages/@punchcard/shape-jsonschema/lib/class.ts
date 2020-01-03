import { JsonSchema, SchemaTag, ToJsonSchema } from './json-schema';

export interface ObjectSchemaProperties {
  [p: string]: JsonSchema;
}
export interface ObjectSchema<P extends ObjectSchemaProperties> {
  type: 'object';
  properties: P;
}

declare module '@punchcard/shape/lib/class' {
  interface ClassShape<C extends ClassType> {
    [SchemaTag]: ObjectSchema<{
      [member in keyof this['Members']]: ToJsonSchema<this['Members'][member]['Type']>
    }>;
  }
}