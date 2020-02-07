import { AttributeValue } from './attribute';
import { DSL } from './dsl';

declare module '@punchcard/shape/lib/record' {
  export interface RecordShape<M extends RecordMembers, I = any> {
    [AttributeValue.Tag]: AttributeValue.Struct<M>;
    [DSL.Tag]: DSL.Struct<this>
  }
}
