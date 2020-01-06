import { Shape } from '@punchcard/shape/lib/shape';
import { AttributeValue } from './attribute';
import { DSL } from './dsl';

declare module '@punchcard/shape/lib/primitive' {
  export interface BoolShape extends Shape {
    [AttributeValue.Tag]: AttributeValue.Bool;
    [DSL.Tag]: DSL.Bool;
  }
  export interface StringShape extends Shape {
    [AttributeValue.Tag]: AttributeValue.StringValue;
    [DSL.Tag]: DSL.String;
  }
  export interface NumberShape {
    [AttributeValue.Tag]: AttributeValue.NumberValue;
    [DSL.Tag]: DSL.Ord<NumberShape>;
  }
  export interface TimestampShape {
    [AttributeValue.Tag]: AttributeValue.StringValue;
    [DSL.Tag]: DSL.String; // TODO: Query.Timestamp
  }
}