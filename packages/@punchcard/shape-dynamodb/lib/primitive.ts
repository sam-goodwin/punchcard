import { Shape } from '@punchcard/shape/lib/shape';
import { AttributeValue } from './attribute';
import { DSL } from './dsl';

declare module '@punchcard/shape/lib/primitive' {
  export interface DynamicShape<T> extends Shape {
    [AttributeValue.Tag]: AttributeValue.Type;
    [DSL.Tag]: DSL.Dynamic<this>;
  }
  export interface BinaryShape extends Shape {
    [AttributeValue.Tag]: AttributeValue.Binary;
    [DSL.Tag]: DSL.Binary;
  }
  export interface BoolShape extends Shape {
    [AttributeValue.Tag]: AttributeValue.Bool;
    [DSL.Tag]: DSL.Bool;
  }
  export interface StringShape extends Shape {
    [AttributeValue.Tag]: AttributeValue.StringValue;
    [DSL.Tag]: DSL.String;
  }
  export interface NothingShape {
    [AttributeValue.Tag]: AttributeValue.NothingValue;
    [DSL.Tag]: DSL.Object<NothingShape>;
  }
  export interface NumberShape {
    [AttributeValue.Tag]: AttributeValue.NumberValue;
    [DSL.Tag]: DSL.Number;
  }
  export interface IntegerShape {
    [AttributeValue.Tag]: AttributeValue.NumberValue;
    [DSL.Tag]: DSL.Number;
  }
  export interface TimestampShape {
    [AttributeValue.Tag]: AttributeValue.StringValue;
    [DSL.Tag]: DSL.String; // TODO: Query.Timestamp
  }
}