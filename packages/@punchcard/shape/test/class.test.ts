import "jest";
import { ClassShape, Member, number, NumberShape, string, StringShape } from "../lib";
import { array, ArrayShape, map, MapShape, set, SetShape } from "../lib/collection";

// tslint:disable: member-access

class Nested {
  a = string;
}

class MyType {
  id = string;
  count = number;
  nested = Nested;
  array = array(string);
  complexArray = array(Nested);
  set = set(string);
  complexSet = set(Nested);
  map = map(string);
  complexMap = map(Nested);
}

const MyTypeShape = ClassShape.of(MyType);

it('should have Kind, "class"', () => {
  expect(MyTypeShape.Kind).toEqual('classShape');
});

it('should cache derived shapes', () => {
  expect(ClassShape.of(MyType) === ClassShape.of(MyType)).toBe(true);
});

it('should parse members', () => {
  expect(MyTypeShape.Members.id).toEqual({
    Name: 'id',
    Type: new StringShape(),
    Metadata: {}
  });

  expect(MyTypeShape.Members.count).toEqual({
    Name: 'count',
    Type: new NumberShape(),
    Metadata: {}
  });

  const nestedShape = new ClassShape(Nested,  {
    a: new Member('a', new StringShape(), {})
  });

  expect(MyTypeShape.Members.nested).toEqual({
    Name: 'nested',
    Type: nestedShape,
    Metadata: {}
  });

  expect(MyTypeShape.Members.array).toEqual({
    Name: 'array',
    Type: new ArrayShape(new StringShape()),
    Metadata: {}
  });
  expect(MyTypeShape.Members.complexArray).toEqual({
    Name: 'complexArray',
    Type: new ArrayShape(nestedShape),
    Metadata: {}
  });

  expect(MyTypeShape.Members.set).toEqual({
    Name: 'set',
    Type: new SetShape(new StringShape()),
    Metadata: {}
  });
  expect(MyTypeShape.Members.complexSet).toEqual({
    Name: 'complexSet',
    Type: new SetShape(nestedShape),
    Metadata: {}
  });

  expect(MyTypeShape.Members.map).toEqual({
    Name: 'map',
    Type: new MapShape(new StringShape()),
    Metadata: {}
  });
  expect(MyTypeShape.Members.complexMap).toEqual({
    Name: 'complexMap',
    Type: new MapShape(nestedShape),
    Metadata: {}
  });
});
