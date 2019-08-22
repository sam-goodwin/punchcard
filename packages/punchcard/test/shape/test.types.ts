import { dynamic } from "../../lib";

it('any.equals should work for all types', () => {
  expect(dynamic.equals(true, true)).toBe(true);
  expect(dynamic.equals(true, false)).toBe(false);
  expect(dynamic.equals('string', 'string')).toBe(true);
  expect(dynamic.equals('string', 'not the string')).toBe(false);
  expect(dynamic.equals('string', 1)).toBe(false);
  expect(dynamic.equals(1, 1)).toBe(true);
  expect(dynamic.equals(1, 2)).toBe(false);
  expect(dynamic.equals({a: 'string'}, {a: 'string'})).toBe(true);
  expect(dynamic.equals({a: 'string'}, {a: 'string', b: 'string'})).toBe(false);
  expect(dynamic.equals(['a', 'b'], ['a', 'b'])).toBe(true);
  expect(dynamic.equals(['a', 'b'], ['a'])).toBe(false);
});
