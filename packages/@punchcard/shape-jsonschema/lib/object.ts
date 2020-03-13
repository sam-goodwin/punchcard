export interface ObjectSchemaProperties {
  [p: string]: any;
}
export interface ObjectSchema<P extends ObjectSchemaProperties> {
  type: 'object';
  properties: P;
  required: string[];
}