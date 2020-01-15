import "jest";
import { any, AnyShape, binary, ClassShape, enumeration, EnumShape, Member, number, NumberShape, Optional, string, StringShape, union, UnionShape, unknown, UnknownShape } from "../lib";
import { array, ArrayShape, map, MapShape, set, SetShape } from "../lib/collection";

// tslint:disable: member-access

class Nested {
  a = string;
}

class MyType {
  anyType = any;
  unknownType = unknown;
  binaryType = binary;
  id = string;
  count = number
    .apply(Optional);
  nested = Nested;
  array = array(string);
  complexArray = array(Nested);
  set = set(string);
  complexSet = set(Nested);
  map = map(string);
  complexMap = map(Nested);

  enum = enumeration('a', 'b');
  union = union(string, number);
}

const MyTypeShape = ClassShape.of(MyType);

it('should have Kind, "class"', () => {
  expect(MyTypeShape.Kind).toEqual('classShape');
});

it('should cache derived shapes', () => {
  expect(ClassShape.of(MyType) === ClassShape.of(MyType)).toBe(true);
});

it('should parse members', () => {
  expect(MyTypeShape.Members.enum).toEqual(new Member(
    'anyType', new EnumShape(['a', 'b']), {}
  ));

  expect(MyTypeShape.Members.union).toEqual(new Member(
    'anyType', new UnionShape([string, number]), {}
  ));

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

  const nestedShape = new ClassShape(Nested,  {
    a: new Member('a', new StringShape(), {})
  });

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
