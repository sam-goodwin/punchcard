import { AttributeValue } from './attribute';
import { DSL } from './dsl';

import './attribute';
import './collection';
import './primitive';

declare module '@punchcard/shape/lib/class' {
  export interface ClassShape<M extends ClassMembers, I = any> {
    [AttributeValue.Tag]: AttributeValue.Struct<this>;
    [DSL.Tag]: DSL.Struct<this>
  }
}
