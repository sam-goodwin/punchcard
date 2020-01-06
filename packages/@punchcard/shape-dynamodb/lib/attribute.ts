import { Shape } from '@punchcard/shape';
import { ClassShape, ClassType } from '@punchcard/shape/lib/class';
import { AssertIsMember } from '@punchcard/shape/lib/util';

declare module '@punchcard/shape/lib/shape' {
  export interface Shape {
    [AttributeValue.Tag]: AttributeValue.Type;
  }
}

// tslint:disable: ban-types

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

  export type Of<T> = T extends { [Tag]: infer T2 } ? T2 : never;
  export type OfType<T> = Of<ClassShape<ClassType<T>>>;

  export interface Binary {
    B: Buffer;
  }
  export interface BinarySet {
    BS: Buffer[];
  }
  export interface Bool {
    BOOL: boolean;
  }
  export interface List<T extends Shape> {
    L: Array<Of<T>>;
  }
  export interface Map<T extends Shape> {
    M: {
      [key: string]: Of<T>;
    };
  }
  export interface Struct<T extends ClassShape<any>> {
    M: {
      [member in keyof T['Members']]: AssertIsMember<T['Members'][member]>['Type'][AttributeValue.Tag]
    };
  }
  export interface NumberValue {
    N: string;
  }
  export interface NumberSet {
    NS: string[];
  }
  export interface StringValue {
    S: string;
  }
  export interface StringSet {
    SS: string[];
  }
}
