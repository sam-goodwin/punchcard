import { AttributeValue } from './attribute';
import { DSL } from './dsl';

import './collection';
import './primitive';

declare module '@punchcard/shape/lib/class' {
  export interface ClassShape<C extends ClassType> {
    [AttributeValue.Tag]: AttributeValue.Struct<{
      [member in keyof this['Members']]: this['Members'][member]['Type'][AttributeValue.Tag]
    }>;
    [DSL.Tag]: DSL.Struct<this>
  }
}
