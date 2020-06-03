import 'jest';

import { any, array, bool, Enum, Equals, HashCode, HashSet, map, number, optional, Record, set, string, Value } from '../lib';

// tslint:disable: member-access
class Nested extends Record('Nested', {
  /**
   * Documentation for `a`
   */
  a: optional(string),

  /**
   * B
   */
  b: string,
}) {}

class MyType extends Record('MyType', {
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
  enum: Enum({
    Up: 'Up'
  } as const)
}) {
  public getId() {
    return this.id || 'default';
  }
}

// some compile-time checks
const v: Value.Of<typeof Nested> = new Nested({a: 'a', b: 'b'});
const vv: Value.Of<typeof Nested> = v;
// tslint:disable: no-unused-expression
v.a;
v.a?.length;

const myType = new MyType({
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
  enum: 'Up',
  set: new Set<string>().add('value'),
  complexSet: HashSet.of(Nested)
    .add(new Nested({
      a: 'a',
      b: 'b'
    })),
});

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
  } = myType;

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

it('should compare equals semantically', () => {
  const eq = Equals.of(MyType);
  expect(eq(myType, myType)).toEqual(true);
  expect(eq(myType, new MyType({
    ...myType,
    count: 2 // different value
  }))).toEqual(false);
});

it('should compute hash code', () => {
  const hc = HashCode.of(MyType);
  expect(hc(myType)).toEqual(hc(myType));
  expect(hc(new MyType({
    ...myType,
    count: 2 // different value
  }))).not.toEqual(hc(myType));
});

describe('Extend', () => {
  class Extended extends MyType.Extend('Extended', {
    extendedProp: string
  }) {}
  const extended = new Extended({
    extendedProp: 'extended',
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
    enum: 'Up',
    set: new Set<string>().add('value'),
    complexSet: HashSet.of(Nested)
      .add(new Nested({
        a: 'a',
        b: 'b'
      })),
  });

  it('should derive runtime type recursively', () => {
    const expected: {
      extendedProp: string;
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
    } = extended;

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

  it('should compare equals semantically', () => {
    const eq = Equals.of(Extended);
    expect(eq(extended, extended)).toEqual(true);
    expect(eq(extended, new Extended({
      ...extended,
      count: 2 // different value
    }))).toEqual(false);
  });

  it('should compute hash code', () => {
    const hc = HashCode.of(Extended);
    expect(hc(extended)).toEqual(hc(extended));
    expect(hc(new Extended({
      ...extended,
      count: 2 // different value
    }))).not.toEqual(hc(extended));
  });
});

describe('Pick', () => {
  class Picked extends MyType.Pick('Picked', ['id']) {}
  const picked = new Picked({
    id: 'id',
  });

  it('should derive runtime type recursively', () => {
    const expected: {
      id?: string | undefined;
    } = picked;

    expect(expected.id).toEqual('id');
  });

  it('should compare equals semantically', () => {
    const eq = Equals.of(Picked);
    expect(eq(picked, picked)).toEqual(true);
    expect(eq(picked, new Picked({
      id: 'different value'
    }))).toEqual(false);
  });

  it('should compute hash code', () => {
    const hc = HashCode.of(Picked);
    expect(hc(picked)).toEqual(hc(picked));
    expect(hc(new Picked({
      id: 'different value'
    }))).not.toEqual(hc(picked));
  });
});
