import {
  Equals,
  HashCode,
  HashSet,
  Record,
  Value,
  any,
  array,
  bool,
  dsl,
  map,
  number,
  optional,
  set,
  string,
} from "../lib";

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
  array: array(string),

  bool,
  complexArray: array(Nested),
  complexMap: map(Nested),

  complexSet: set(Nested),
  count: number,
  dynamic: any,
  id: optional(string),
  map: map(string),
  nested: optional(Nested),
  set: set(string),
}) {
  public static readonly DSL = dsl(MyType);

  public getId(): string {
    return this.id || "default";
  }
}

// some compile-time checks
const v: Value.Of<typeof Nested> = new Nested({a: "a", b: "b"});
// @ts-ignore
const vv: Value.Of<typeof Nested> = v;
v.b;
v.a;
v.a?.length;

const myType = new MyType({
  array: ["some", "strings"],
  bool: true,
  complexArray: [
    new Nested({
      a: "a",
      b: "b",
    }),
  ],
  complexMap: {
    key: new Nested({
      a: "a",
      b: "b",
    }),
  },
  complexSet: HashSet.of(Nested).add(
    new Nested({
      a: "a",
      b: "b",
    }),
  ),
  count: 1,
  dynamic: ["dynamic"],
  id: "id",
  map: {
    key: "value",
  },
  nested: new Nested({
    b: "b",
  }),
  set: new Set<string>().add("value"),
});

describe("recursion, comparison, hashing", () => {
  it("should derive runtime type recursively", () => {
    expect.assertions(11);
    const expected: {
      array: string[];
      bool: boolean;
      complexArray: Nested[];
      complexMap: {[key: string]: Nested};

      complexSet: Set<Nested>;

      count: number;
      dynamic: any;

      id?: string | undefined;
      map: {[key: string]: string};

      nested?: Nested;
      set: Set<string>;
    } = myType;

    expect(expected.array).toStrictEqual(["some", "strings"]);
    expect(expected.bool).toStrictEqual(true);
    expect(expected.complexArray).toStrictEqual([
      new Nested({
        a: "a",
        b: "b",
      }),
    ]);
    expect(expected.complexMap).toStrictEqual({
      key: new Nested({
        a: "a",
        b: "b",
      }),
    });
    expect(expected.complexSet).toStrictEqual(
      HashSet.of(Nested).add(
        new Nested({
          a: "a",
          b: "b",
        }),
      ),
    );
    expect(expected.count).toStrictEqual(1);
    expect(expected.dynamic).toStrictEqual(["dynamic"]);
    expect(expected.id).toStrictEqual("id");
    expect(expected.map).toStrictEqual({
      key: "value",
    });
    expect(expected.nested).toStrictEqual(
      new Nested({
        b: "b",
      }),
    );
    expect(expected.set).toStrictEqual(new Set().add("value"));
  });

  it("should compare equals semantically", () => {
    expect.assertions(2);
    const eq = Equals.of(MyType);
    expect(eq(myType, myType)).toStrictEqual(true);
    expect(
      eq(
        myType,
        new MyType({
          ...myType,
          count: 2, // different value
        }),
      ),
    ).toStrictEqual(false);
  });

  it("should compute hash code", () => {
    expect.assertions(2);
    const hc = HashCode.of(MyType);
    expect(hc(myType)).toStrictEqual(hc(myType));
    expect(
      hc(
        new MyType({
          ...myType,
          count: 2, // different value
        }),
      ),
    ).not.toStrictEqual(hc(myType));
  });
});

describe("extend", () => {
  class Extended extends MyType.Extend({
    extendedProp: string,
  }) {}
  const extended = new Extended({
    array: ["some", "strings"],
    bool: true,
    complexArray: [
      new Nested({
        a: "a",
        b: "b",
      }),
    ],
    complexMap: {
      key: new Nested({
        a: "a",
        b: "b",
      }),
    },
    complexSet: HashSet.of(Nested).add(
      new Nested({
        a: "a",
        b: "b",
      }),
    ),
    count: 1,
    dynamic: ["dynamic"],
    extendedProp: "extended",
    id: "id",
    map: {
      key: "value",
    },
    nested: new Nested({
      b: "b",
    }),
    set: new Set<string>().add("value"),
  });

  it("should derive runtime type recursively", () => {
    expect.assertions(11);
    const expected: {
      array: string[];
      bool: boolean;
      complexArray: Nested[];
      complexMap: {[key: string]: Nested};
      complexSet: Set<Nested>;

      count: number;

      dynamic: any;
      extendedProp: string;

      id?: string | undefined;
      map: {[key: string]: string};

      nested?: Nested;
      set: Set<string>;
    } = extended;

    expect(expected.array).toStrictEqual(["some", "strings"]);
    expect(expected.bool).toStrictEqual(true);
    expect(expected.complexArray).toStrictEqual([
      new Nested({
        a: "a",
        b: "b",
      }),
    ]);
    expect(expected.complexMap).toStrictEqual({
      key: new Nested({
        a: "a",
        b: "b",
      }),
    });
    expect(expected.complexSet).toStrictEqual(
      HashSet.of(Nested).add(
        new Nested({
          a: "a",
          b: "b",
        }),
      ),
    );
    expect(expected.count).toStrictEqual(1);
    expect(expected.dynamic).toStrictEqual(["dynamic"]);
    expect(expected.id).toStrictEqual("id");
    expect(expected.map).toStrictEqual({
      key: "value",
    });
    expect(expected.nested).toStrictEqual(
      new Nested({
        b: "b",
      }),
    );
    expect(expected.set).toStrictEqual(new Set().add("value"));
  });

  it("should compare equals semantically", () => {
    expect.assertions(2);
    const eq = Equals.of(Extended);
    expect(eq(extended, extended)).toStrictEqual(true);
    expect(
      eq(
        extended,
        new Extended({
          ...extended,
          count: 2, // different value
        }),
      ),
    ).toStrictEqual(false);
  });

  it("should compute hash code", () => {
    expect.assertions(2);
    const hc = HashCode.of(Extended);
    expect(hc(extended)).toStrictEqual(hc(extended));
    expect(
      hc(
        new Extended({
          ...extended,
          count: 2, // different value
        }),
      ),
    ).not.toStrictEqual(hc(extended));
  });
});

describe("pick", () => {
  class Picked extends MyType.Pick(["id"]) {}
  const picked = new Picked({
    id: "id",
  });

  it("should derive runtime type recursively", () => {
    expect.assertions(1);
    const expected: {
      id?: string | undefined;
    } = picked;

    expect(expected.id).toStrictEqual("id");
  });

  it("should compare equals semantically", () => {
    expect.assertions(2);
    const eq = Equals.of(Picked);
    expect(eq(picked, picked)).toStrictEqual(true);
    expect(
      eq(
        picked,
        new Picked({
          id: "different value",
        }),
      ),
    ).toStrictEqual(false);
  });

  it("should compute hash code", () => {
    expect.assertions(2);
    const hc = HashCode.of(Picked);
    expect(hc(picked)).toStrictEqual(hc(picked));
    expect(
      hc(
        new Picked({
          id: "different value",
        }),
      ),
    ).not.toStrictEqual(hc(picked));
  });
});
