import 'jest';

import { bool, HashSet, Maximum, MaxLength, Minimum, MinLength, MultipleOf, nothing, number, Optional, optional, Pattern, Record, string } from '@punchcard/shape';
import { array, map, set } from '@punchcard/shape/lib/collection';

import { Json } from '../lib';

// tslint:disable: member-access

class Nested extends Record({
  /**
   * A docs.
   */
  a: string
    .apply(Optional)
}) {}

Nested.toJson()

class MyType extends Record({
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

  null: nothing,
  optional: optional(string)
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
  complexMap: {
    key: {
      a: 'complexMap'
    }
  },
  null: null
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
  complexMap: {
    key: new Nested({
      a: 'complexMap'
    })
  },
  null: null
});

test('should read shape from json', () => {
  expect(mapper.read(jsonRepr)).toEqual(runtimeRepr);
});

test('should write shape to json', () => {
  expect(mapper.write(runtimeRepr)).toEqual(jsonRepr);
});

class Empty extends Record({}) {}

test('should support empty record', () => {
  expect(() => Json.mapper(Empty)).not.toThrow();
});
