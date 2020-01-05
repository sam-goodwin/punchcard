import { Shape } from '@punchcard/shape/lib/shape';
import { AttributeValue, Tag } from './attribute';

declare module '@punchcard/shape/lib/primitive' {
  export interface StringShape extends Shape {
    [Tag]: AttributeValue.StringValue;
  }
  export interface NumberShape {
    [Tag]: AttributeValue.NumberValue;
  }
  export interface TimestampShape {
    [Tag]: AttributeValue.StringValue;
  }
}