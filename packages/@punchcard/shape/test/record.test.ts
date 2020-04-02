import 'jest';
import { any, AnyShape, binary, number, NumberShape, optional, Record, RecordShape, Shape, string, StringShape, unknown, UnknownShape } from '../lib';
import { array, ArrayShape, map, MapShape, set, SetShape } from '../lib/collection';

// tslint:disable: member-access

class Nested extends Record('Nested', {
  a: string
}) {}

class MyType extends Record('MyType', {
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

it('should have Kind, "recordShape"', () => {
  expect(MyType.Kind).toEqual('recordShape');
});

it('should parse members', () => {
  expect(MyType.Members.anyType).toEqual(new AnyShape());
  expect(MyType.Members.unknownType).toEqual(new UnknownShape());
  expect(MyType.Members.id).toEqual(new StringShape());
  expect(MyType.Members.count).toEqual(new NumberShape());
  expect(MyType.Members.nested).toEqual(Nested);
  expect(MyType.Members.array).toEqual(new ArrayShape(new StringShape()));
  expect(MyType.Members.complexArray).toEqual(new ArrayShape(Nested));
  expect(MyType.Members.set).toEqual(new SetShape(new StringShape()));
  expect(MyType.Members.complexSet).toEqual(new SetShape(Nested),);
  expect(MyType.Members.map).toEqual(new MapShape(new StringShape()));
  expect(MyType.Members.complexMap).toEqual(new MapShape(Nested));
});

class Empty extends Record('Empty', {}) {}

it('should support no members', () => {
  expect(Empty.Members).toEqual({});
});
