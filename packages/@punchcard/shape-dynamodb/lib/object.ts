import { AttributeValue, Tag } from './attribute';

import './collection';
import './primitive';

declare module '@punchcard/shape/lib/class' {
  export interface ClassShape<C extends ClassType> {
    [Tag]: AttributeValue.Struct<{
      [member in keyof this['Members']]: this['Members'][member]['Type'][Tag]
    }>
  }
}
