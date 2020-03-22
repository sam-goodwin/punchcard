import {
  AnyShape,
  NumberShape,
  Record,
  StringShape,
  UnknownShape,
  any,
  binary,
  number,
  optional,
  string,
  unknown,
} from "../lib";
import {
  ArrayShape,
  MapShape,
  SetShape,
  array,
  map,
  set,
} from "../lib/collection";

class Nested extends Record({
  a: string,
}) {}

class MyType extends Record({
  anyType: any,
  array: array(string),
  binaryType: binary,
  complexArray: array(Nested),
  complexMap: map(Nested),
  complexSet: set(Nested),
  count: optional(number),
  id: string,
  map: map(string),
  nested: Nested,
  set: set(string),
  unknownType: unknown,
}) {}

describe("records", () => {
  it('should have Kind, "recordShape"', () => {
    expect.assertions(1);
    expect(MyType.Kind).toStrictEqual("recordShape");
  });

  it("should parse members", () => {
    expect.assertions(11);
    expect(MyType.Members.anyType).toStrictEqual(new AnyShape());
    expect(MyType.Members.unknownType).toStrictEqual(new UnknownShape());
    expect(MyType.Members.id).toStrictEqual(new StringShape());
    expect(MyType.Members.count).toStrictEqual(new NumberShape());
    expect(MyType.Members.nested).toStrictEqual(Nested);
    expect(MyType.Members.array).toStrictEqual(
      new ArrayShape(new StringShape()),
    );
    expect(MyType.Members.complexArray).toStrictEqual(new ArrayShape(Nested));
    expect(MyType.Members.set).toStrictEqual(new SetShape(new StringShape()));
    expect(MyType.Members.complexSet).toStrictEqual(new SetShape(Nested));
    expect(MyType.Members.map).toStrictEqual(new MapShape(new StringShape()));
    expect(MyType.Members.complexMap).toStrictEqual(new MapShape(Nested));
  });

  class Empty extends Record({}) {}

  it("should support no members", () => {
    expect.assertions(1);
    expect(Empty.Members).toStrictEqual({});
  });
});
