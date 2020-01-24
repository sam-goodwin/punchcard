import "jest";
import { any, AnyShape, binary, ClassShape, Member, number, NumberShape, optional, Record, Shape, string, StringShape, unknown, UnknownShape } from "../lib";
import { array, ArrayShape, map, MapShape, set, SetShape } from "../lib/collection";

// tslint:disable: member-access

class Nested extends Record({
  a: string
}) {}

class MyType extends Record({
  anyType: any,
  unknownType: unknown,
  binaryType: binary,
  id: string,
  count: optional(number),
  nested: Nested,
  array: array(string),
  complexArray: array(Nested),
  set: set(string),
  complexSet: set(Nested),
  map: map(string),
  complexMap: map(Nested)
}) {}

const MyTypeShape = Shape.of(MyType);

it('should have Kind, "class"', () => {
  expect(MyTypeShape.Kind).toEqual('classShape');
});

it('should cache derived shapes', () => {
  expect(Shape.of(MyType) === Shape.of(MyType)).toBe(true);
});

it('should parse members', () => {
  expect(MyTypeShape.Members.anyType).toEqual(new Member(
    'anyType', new AnyShape(), {}
  ));

  expect(MyTypeShape.Members.unknownType).toEqual(new Member(
    'unknownType', new UnknownShape(), {}
  ));

  expect(MyTypeShape.Members.id).toEqual(new Member(
    'id', new StringShape(), {}
  ));

  expect(MyTypeShape.Members.count).toEqual(new Member(
    'count', new NumberShape(), {
      nullable: true
    }
  ));

  const nestedShape = new ClassShape({a: string}, {});

  expect(MyTypeShape.Members.nested).toEqual(new Member(
    'nested', nestedShape, {}
  ));

  expect(MyTypeShape.Members.array).toEqual(new Member(
    'array', new ArrayShape(new StringShape()), {}
  ));
  expect(MyTypeShape.Members.complexArray).toEqual(new Member(
    'complexArray', new ArrayShape(nestedShape), {}
  ));

  expect(MyTypeShape.Members.set).toEqual(new Member(
    'set', new SetShape(new StringShape()), {}
  ));
  expect(MyTypeShape.Members.complexSet).toEqual(new Member(
    'complexSet', new SetShape(nestedShape), {},
  ));

  expect(MyTypeShape.Members.map).toEqual(new Member(
    'map', new MapShape(new StringShape()), {}
  ));
  expect(MyTypeShape.Members.complexMap).toEqual(new Member(
    'complexMap', new MapShape(nestedShape), {}
  ));
});
