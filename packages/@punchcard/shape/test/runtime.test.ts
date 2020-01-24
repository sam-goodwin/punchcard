import 'jest';

import { any, array, bool, HashSet, map, number, optional, Record, set, Shape, string, Value, } from '../lib';

// tslint:disable: member-access
class Nested extends Record({
  /**
   * Documentation for `a`
   */
  a: optional(string),

  /**
   * B
   */
  b: string,
}) {}

class MyType extends Record({
  /**
   * Field documentation.
   */
  id: optional(string),

  dynamic: any,
  count: number,
  bool,

  nested: optional(Nested),
  array: array(string),
  complexArray: array(Nested),
  set: set(string),
  complexSet: set(Nested),
  map: map(string),
  complexMap: map(Nested),
}) {
  public getId() {
    return this.id || 'default';
  }
}

// some compile-time checks
const s = Shape.of(Nested);
const v: Value.Of<typeof s> = new Nested({a: 'a', b: 'b'});
const vv: Value.Of<typeof Nested> = v;

// tslint:disable: no-unused-expression
v.b;
v.a;
v.a?.length;

it('should derive runtime type recursively', () => {
  const expected: {
    id?: string | undefined;
    count: number;
    bool: boolean;
    dynamic: any;

    nested?: Nested;

    array: string[];
    complexArray: Nested[];

    set: Set<string>;
    complexSet: Set<Nested>;

    map: { [key: string]: string; };
    complexMap: { [key: string]: Nested; };
  } = new MyType({
    id: 'id',
    count: 1,
    bool: true,
    dynamic: ['dynamic'],
    nested: new Nested({
      b: 'b'
    }),
    array: ['some', 'strings'],
    complexArray: [new Nested({
      a: 'a',
      b: 'b'
    })],
    map: {
      key: 'value'
    },
    complexMap: {
      key: new Nested({
        a: 'a',
        b: 'b'
      })
    },
    set: new Set<string>().add('value'),
    complexSet: HashSet.of(Nested)
      .add(new Nested({
        a: 'a',
        b: 'b'
      })),
  });

  expect(expected.array).toEqual(['some', 'strings']);
  expect(expected.bool).toEqual(true);
  expect(expected.complexArray).toEqual([new Nested({
    a: 'a',
    b: 'b'
  })]);
  expect(expected.complexMap).toEqual({
    key: new Nested({
      a: 'a',
      b: 'b'
    })
  });
  expect(expected.complexSet).toEqual(HashSet.of(Nested).add(new Nested({
    a: 'a',
    b: 'b'
  })));
  expect(expected.count).toEqual(1);
  expect(expected.dynamic).toEqual(['dynamic']);
  expect(expected.id).toEqual('id');
  expect(expected.map).toEqual({
    key: 'value'
  });
  expect(expected.nested).toEqual(new Nested({
    b: 'b'
  }));
  expect(expected.set).toEqual(new Set().add('value'));
});
