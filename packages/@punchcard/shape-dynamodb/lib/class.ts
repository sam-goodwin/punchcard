import { AttributeValue } from './attribute';
import { Query } from './query';

import './collection';
import './primitive';

declare module '@punchcard/shape/lib/class' {
  export interface ClassShape<C extends ClassType> {
    [AttributeValue.Tag]: AttributeValue.Struct<{
      [member in keyof this['Members']]: this['Members'][member]['Type'][AttributeValue.Tag]
    }>;
    [Query.Tag]: Query.Struct<this, {
      [member in keyof this['Members']]: this['Members'][member]['Type'][Query.Tag]
    }>
  }
}
