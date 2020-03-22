import {
  HashSet,
  MaxLength,
  Maximum,
  MinLength,
  Minimum,
  MultipleOf,
  Optional,
  Pattern,
  Record,
  bool,
  dsl,
  nothing,
  number,
  optional,
  string,
} from "@punchcard/shape";
import {array, map, set} from "@punchcard/shape/lib/collection";

import {Json} from "../lib";

class Nested extends Record({
  /**
   * A docs.
   */
  a: string.apply(Optional),
}) {}
class MyType extends Record({
  /**
   * Field documentation.
   */
  array: array(string),
  boolean: bool,
  complexArray: array(Nested),

  complexMap: map(Nested),
  complexSet: set(Nested),
  count: number
    .apply(Maximum(1))
    .apply(Minimum(1, true))
    .apply(MultipleOf(2)),
  id: string
    .apply(MaxLength(1))
    .apply(MinLength(0))
    .apply(Pattern(".*")),
  map: map(string),
  nested: Nested,
  null: nothing,

  optional: optional(string),
  set: set(string),
}) {
  public static readonly DSL = dsl(MyType);
}

const mapper = Json.mapper(MyType);

const jsonRepr = {
  array: ["array1", "arra2"],
  boolean: true,
  complexArray: [{a: "complexArray"}],
  complexMap: {
    key: {
      a: "complexMap",
    },
  },
  complexSet: [{a: "complexSet"}],
  count: 1,
  id: "id",
  map: {
    a: "map",
  },
  nested: {a: "nested"},
  null: null,
  set: ["set1", "set2"],
};

const runtimeRepr = new MyType({
  array: ["array1", "arra2"],
  boolean: true,
  complexArray: [new Nested({a: "complexArray"})],
  complexMap: {
    key: new Nested({
      a: "complexMap",
    }),
  },
  complexSet: HashSet.of(Nested).add(new Nested({a: "complexSet"})),
  count: 1,
  id: "id",
  map: {
    a: "map",
  },
  nested: new Nested({a: "nested"}),
  null: null,
  set: new Set(["set1", "set2"]),
});

test("should read shape from json", () => {
  expect(mapper.read(jsonRepr)).toStrictEqual(runtimeRepr);
});

test("should write shape to json", () => {
  expect(mapper.write(runtimeRepr)).toStrictEqual(jsonRepr);
});

class Empty extends Record({}) {}

test("should support empty record", () => {
  expect(() => Json.mapper(Empty)).not.toThrow();
});
