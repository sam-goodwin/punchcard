import { JsonSchema } from './json-schema';

export interface ObjectSchemaProperties {
  [p: string]: any;
}
export interface ObjectSchema<P extends ObjectSchemaProperties> {
  type: 'object';
  properties: P;
  required: string[];
}

declare module '@punchcard/shape/lib/class' {
  interface ClassShape<M extends ClassMembers, I> {
    [JsonSchema.Tag]: ObjectSchema<{
      [member in keyof this['Members']]: this['Members'][member]['Shape'][JsonSchema.Tag];
    }>
  }
}
