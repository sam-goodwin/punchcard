import { RequiredKeys, Shape } from '@punchcard/shape';
import { RecordMembers, ShapeOrRecord } from '@punchcard/shape/lib/record';

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
    | AttributeValue.NothingValue
    | AttributeValue.NumberSet
    | AttributeValue.NumberValue
    | AttributeValue.StringSet
    | AttributeValue.StringValue
    | AttributeValue.Struct<any>
    ;

  export type Of<T extends ShapeOrRecord> = Shape.Of<T> extends { [Tag]: infer T2 } ? T2 : never;

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
      [key: string]: Of<T> | undefined;
    };
  }
  export interface Struct<T extends RecordMembers> {
    M: {
      /**
       * Write each member and their documentation to the structure.
       * Write them all as '?' for now.
       */
      [M in keyof T]+?: AttributeValue.Of<T[M]>;
    } & {
      /**
       * Remove '?' from required properties.
       */
      [M in RequiredKeys<T>]-?: AttributeValue.Of<T[M]>;
    };
  }
  export interface NumberValue {
    N: string;
  }
  export interface NothingValue {
    NULL: true;
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
