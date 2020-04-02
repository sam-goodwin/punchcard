import { ArrayShape, BinaryShape, DynamicShape, IntegerShape, MapShape, Meta, NothingShape, NumberShape, Pointer, RecordShape, SetShape, StringShape } from '@punchcard/shape';
import { Shape } from '@punchcard/shape/lib/shape';
import { ArraySchema, MapSchema, SetSchema } from './collection';
import { ObjectSchema } from './object';
import { AnySchema, BinarySchema, BoolSchema, IntegerSchema, NothingSchema, NumberSchema, StringSchema, TimestampSchema } from './primitive';
import { ToJsonSchemaVisitor } from './visitor';

export type JsonSchema =
  | AnySchema
  | ArraySchema<any>
  | BinarySchema<any>
  | BoolSchema
  | IntegerSchema
  | MapSchema<any>
  | NumberSchema
  | ObjectSchema<any>
  | SetSchema<any>
  | StringSchema
  | TimestampSchema
  ;

export namespace JsonSchema {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-json.Tag');

  export type Of<T extends Shape> =
    T extends BinaryShape ? BinarySchema<Meta.GetData<T>> :
    T extends BoolSchema ? BoolSchema :
    T extends DynamicShape<any> ? AnySchema :
    T extends IntegerShape ? IntegerSchema<Meta.GetData<T>> :
    T extends NothingShape ? NothingSchema :
    T extends NumberShape ? NumberSchema<Meta.GetData<T>> :
    T extends StringShape ? StringSchema<Meta.GetData<T>> :

    T extends ArrayShape<infer I> ? ArraySchema<I> :
    T extends MapShape<infer V> ? MapSchema<V> :
    T extends SetShape<infer I> ? SetSchema<I> :
    T extends RecordShape<infer M> ? ObjectSchema<{
      [m in keyof M]: Of<M[m]>;
    }> :

    T extends { [Tag]: infer J } ? J :
    never
    ;

  export function of<T extends Shape>(item: T): JsonSchema.Of<T> {
    return item.visit(new ToJsonSchemaVisitor() as any, undefined);
  }
}
