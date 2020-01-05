import { ClassShape, ClassType } from '@punchcard/shape/lib/class';

declare module '@punchcard/shape/lib/shape' {
  export interface Shape {
    [AttributeValue.Tag]: AttributeValue.Type;
  }
}
  // tslint:disable: ban-types

// export type AttributeValue.Type =
//   | AttributeValue.Binary
//   | AttributeValue.BinarySet
//   | AttributeValue.Bool
//   | AttributeValue.List<any>
//   | AttributeValue.Map<any>
//   | AttributeValue.NumberValue
//   | AttributeValue.NumberSet
//   | AttributeValue.StringValue
//   | AttributeValue.StringSet
//   ;

export const Kind = Symbol.for('@punchcard/shape-dynamodb.AttributeValue.Kind');

export namespace AttributeValue {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-dynamodb.AttributeValue.Tag');

  export type Type =
    | AttributeValue.Binary
    | AttributeValue.BinarySet
    | AttributeValue.Bool
    | AttributeValue.List<any>
    | AttributeValue.Map<any>
    | AttributeValue.NumberValue
    | AttributeValue.NumberSet
    | AttributeValue.StringValue
    | AttributeValue.StringSet
    ;

  export type ValueOf<T> = T extends { [Tag]: infer T2 } ? T2 : never;
  export type ValueOfType<T> = ValueOf<ClassShape<ClassType<T>>>;

  export interface Binary {
    B: Buffer;
  }
  export interface BinarySet {
    BS: Buffer[];
  }
  export interface Bool {
    BOOL: boolean;
  }
  export interface List<T extends AttributeValue.Type> {
    L: T[];
  }
  export interface Map<T extends AttributeValue.Type> {
    M: {
      [key: string]: T;
    };
  }
  export interface Struct<T extends { [key: string]: AttributeValue.Type; }> {
    M: T;
  }
  export interface NumberValue {
    N: string;
  }
  export interface NumberSet {
    NS: number[];
  }
  export interface StringValue {
    S: string;
  }
  export interface StringSet {
    SS: string[];
  }
}
