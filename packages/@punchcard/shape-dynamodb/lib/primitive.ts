import { Shape } from '@punchcard/shape/lib/shape';
import { AttributeValue } from './attribute';
import { Query } from './query';

declare module '@punchcard/shape/lib/primitive' {
  export interface BoolShape extends Shape {
    [AttributeValue.Tag]: AttributeValue.Bool;
    [Query.Tag]: Query.Bool;
  }
  export interface StringShape extends Shape {
    [AttributeValue.Tag]: AttributeValue.StringValue;
    [Query.Tag]: Query.String;
  }
  export interface NumberShape {
    [AttributeValue.Tag]: AttributeValue.NumberValue;
    [Query.Tag]: Query.Ord<NumberShape>;
  }
  export interface TimestampShape {
    [AttributeValue.Tag]: AttributeValue.StringValue;
    [Query.Tag]: Query.String; // TODO: Query.Timestamp
  }
}