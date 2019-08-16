import { any, set } from "../../lib";

it('any.equals should work for all types', () => {
  expect(any.equals(true, true)).toBe(true);
  expect(any.equals(true, false)).toBe(false);
  expect(any.equals('string', 'string')).toBe(true);
  expect(any.equals('string', 'not the string')).toBe(false);
  expect(any.equals('string', 1)).toBe(false);
  expect(any.equals(1, 1)).toBe(true);
  expect(any.equals(1, 2)).toBe(false);
  expect(any.equals({a: 'string'}, {a: 'string'})).toBe(true);
  expect(any.equals({a: 'string'}, {a: 'string', b: 'string'})).toBe(false);
  expect(any.equals(['a', 'b'], ['a', 'b'])).toBe(true);
  expect(any.equals(['a', 'b'], ['a'])).toBe(false);
});
