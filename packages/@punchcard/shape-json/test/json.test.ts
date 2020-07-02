import 'jest';

import { bool, Enum, HashSet, Maximum, MaxLength, Minimum, MinLength, MultipleOf, nothing, number, optional, Pattern, string, Type, union } from '@punchcard/shape';
import { array, map, set } from '@punchcard/shape/lib/collection';

import { Json } from '../lib';

// tslint:disable: member-access

class Nested extends Type('Nested', {
  /**
   * A docs.
   */
  a: optional(string)
}) {}
class MyType extends Type('MyType', {
  /**
   * Field documentation.
   */
  id: string
    .apply(MaxLength(1))
    .apply(MinLength(0))
    .apply(Pattern('.*'))
    ,

  count: number
    .apply(Maximum(1))
    .apply(Minimum(1, true))
    .apply(MultipleOf(2))
    ,

  boolean: bool,

  nested: Nested,
  array: array(string),
  complexArray: array(Nested),
  set: set(string),
  complexSet: set(Nested),
  map: map(string),
  complexMap: map(Nested),
  union: union(string, number),

  null: nothing,
  optional: optional(string),
  enum: Enum({
    Up: 'Up'
  } as const)
}) {}

const mapper = Json.mapper(MyType);

const jsonRepr = {
  id: 'id',
  count: 1,
  boolean: true,
  nested: { a: 'nested' },
  array: ['array1', 'arra2'],
  complexArray: [{ a: 'complexArray' }],
  set: ['set1', 'set2'],
  complexSet: [{a: 'complexSet'}],
  map: {
    a: 'map'
  },
  union: 1,
  complexMap: {
    key: {
      a: 'complexMap'
    }
  },
  null: undefined,
  enum: 'Up' as const
};

const runtimeRepr = new MyType({
  id: 'id',
  count: 1,
  boolean: true,
  nested: new Nested({ a: 'nested' }),
  array: ['array1', 'arra2'],
  complexArray: [new Nested({ a: 'complexArray' })],
  set: new Set(['set1', 'set2']),
  complexSet: HashSet.of(Nested).add(new Nested({a: 'complexSet'})),
  map: {
    a: 'map'
  },
  union: 1,
  complexMap: {
    key: new Nested({
      a: 'complexMap'
    })
  },
  null: undefined,
  enum: 'Up'
});

test('should read shape from json', () => {
  expect(mapper.read(jsonRepr)).toEqual(runtimeRepr);
});

test('should write shape to json', () => {
  expect(mapper.write(runtimeRepr)).toEqual(jsonRepr);
});

class Empty extends Type('Empty', {}) {}

test('should support empty record', () => {
  expect(() => Json.mapper(Empty)).not.toThrow();
});
