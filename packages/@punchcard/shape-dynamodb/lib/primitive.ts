import { Shape } from '@punchcard/shape/lib/shape';
import { AttributeValue } from './attribute';

declare module '@punchcard/shape/lib/primitive' {
  export interface StringShape extends Shape {
    [AttributeValue.Tag]: AttributeValue.StringValue;
  }
  export interface NumberShape {
    [AttributeValue.Tag]: AttributeValue.NumberValue;
  }
  export interface TimestampShape {
    [AttributeValue.Tag]: AttributeValue.StringValue;
  }
}