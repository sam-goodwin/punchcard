import "jest";
import { ClassShape, string } from "../lib";

// tslint:disable: member-access

class OtherType {
  id = string;
}

class MyType {
  key = string;
  other = OtherType;
}

const a = ClassShape.of(MyType);

it('should cache derived shapes', () => {
  expect(ClassShape.of(MyType) === ClassShape.of(MyType)).toBe(true);
});

it('should parse members', () => {
  expect(a.Members.key.Name).toEqual('key');
  expect(a.Members.other.Name).toEqual('other');
  expect(a.Members.other.Type.Members.id.Name).toEqual('id');
});
