import { Record, ShapeOrRecord } from './record';
import { Shape } from './shape';

import { integer, string } from './primitive';
import { Value } from './value';

export interface TaggedUnion {
  [tag: string]: ShapeOrRecord;
}

// export class UnionShape<T extends TaggedUnion> extends Shape {
//   public readonly Kind: 'unionShape' = 'unionShape';

//   constructor(public readonly tags: T) {
//     super();
//   }
// }

// export function union<T extends TaggedUnion>(types: T): UnionShape<T> {
//   return new UnionShape(types);
// }

interface UnionValue<Value> {
  tag: string;
  value: Value;
}

type UnionType<T extends TaggedUnion> =
  new(value: {
    [tag in keyof T]?: Value.Of<T[tag]>
  }) => UnionValue<Value.Of<T[keyof T]>>;

export function Union<T extends TaggedUnion>(union: T): UnionType<T> {
  class NewType {
    public readonly tag: keyof T;
    public readonly value: Value.Of<T[this['tag']]>;

    constructor(value: { [tag in keyof T]?: Value.Of<T[tag]>; }) {
      if (!value || Object.keys(value).length !== 1) {
        throw new Error(`must specify a SINGLE value for the tagged union: (${Object.keys(union).join(', ')})`);
      }
      for (const [tag, v] of Object.entries(value)) {
        this.tag = tag;
        this.value = v as any;
      }
    }
  }

  return NewType as any;
}

class A extends Record({
  a: string
}) {}

class StringOrIntegerOrA extends Union({
  string,
  integer,
  A
}) {}

new StringOrIntegerOrA({
  string: 'string value'
});
