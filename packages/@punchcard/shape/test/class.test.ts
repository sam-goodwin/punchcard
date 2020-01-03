import "jest";
import { ClassShape, string } from "../lib";
import { MaxLength } from "../lib/decorator";

// tslint:disable: member-access

class OtherType {
  id = string;
}

class MyType {
  @MaxLength(1)
  key = string;

  other = OtherType;
}

const MyTypeShape = ClassShape.of(MyType);

it('should have Kind, "class"', () => {
  expect(MyTypeShape.Kind).toEqual('classShape');
});

it('should cache derived shapes', () => {
  expect(ClassShape.of(MyType) === ClassShape.of(MyType)).toBe(true);
});

it('should parse members', () => {
  expect(MyTypeShape.Members.key.Name).toEqual('key');
  expect(MyTypeShape.Members.other.Name).toEqual('other');
  expect(MyTypeShape.Members.other.Type.Members.id.Name).toEqual('id');
});
