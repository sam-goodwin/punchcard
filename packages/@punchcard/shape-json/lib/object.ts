import { JsonSchema } from './json-schema';

export interface ObjectSchemaProperties {
  [p: string]: JsonSchema;
}
export interface ObjectSchema<P extends ObjectSchemaProperties> {
  type: 'object';
  properties: P;
  required: string[];
}

declare module '@punchcard/shape/lib/class' {
  interface ClassShape<C extends ClassType> {
    [JsonSchema.Tag]: ObjectSchema<{
      [member in keyof this['Members']]: JsonSchema.Of<this['Members'][member]['Type']>
    }>;
  }
}
