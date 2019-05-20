import { Shape } from './shape';
import { StructFields, StructPath, StructType } from './types';

export * from '../storage/dynamodb/mapper';
export * from './json';
export * from './mapper';
export * from './period';
export * from './shape';
export * from './types';

export function jsonPath<S extends Shape>(schema: S): StructFields<S> {
  return new StructPath(null as any, '$', new StructType(schema)).fields;
}

export function jsonSchema<S extends Shape>(schema: S): { [key: string]: any } {
  return new StructType(schema).toJsonSchema();
}
