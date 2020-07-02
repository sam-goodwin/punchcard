import 'jest';
import { array, boolean, Enum, Equals, map, number, string, timestamp, Type, union } from '../lib';

it('enum', () => {
  const eq = Equals.of(Enum({
    Up: 'Up'
  }));
  expect(eq('Up', 'Up')).toBe(true);
  expect(eq('Up', 'UP')).toBe(false);
});

it('string', () => {
  const eq = Equals.of(string);

  expect(eq('a', 'a')).toBe(true);
  expect(eq('a', 'b')).toBe(false);
});

it('number', () => {
  const eq = Equals.of(number);

  expect(eq(1, 1)).toBe(true);
  expect(eq(1, 2)).toBe(false);
});

it('timestamp', () => {
  const eq = Equals.of(timestamp);

  expect(eq(new Date(0), new Date(0))).toBe(true);
  expect(eq(new Date(0), new Date(1))).toBe(false);
});

it('boolean', () => {
  const eq = Equals.of(boolean);

  expect(eq(true, true)).toBe(true);
  expect(eq(false, false)).toBe(true);
  expect(eq(true, false)).toBe(false);
});

it('array', () => {
  const eq = Equals.of(array(number));

  expect(eq([], [])).toBe(true);
  expect(eq([1], [1])).toBe(true);
  expect(eq([1, 2], [1, 2])).toBe(true);
  expect(eq([1, 2], [1])).toBe(false);
  expect(eq([0], [1])).toBe(false);
});

it('map', () => {
  const eq = Equals.of(map(number));

  expect(eq({}, {})).toBe(true);
  expect(eq({key: 1}, {key: 1})).toBe(true);
  expect(eq({key: 1}, {key: 2})).toBe(false);
  expect(eq({key: 1}, {})).toBe(false);
});

it('record', () => {
  class A extends Type({
    key: number
  }) {}
  const eq = Equals.of(A);

  expect(eq(new A({key: 1}), new A({key: 1}))).toBe(true);
  expect(eq({key: 1}, {key: 2})).toBe(false);
});

it('union', () => {
  class A extends Type({
    key: number
  }) {}
  const eq = Equals.of(union(string, number, A, array(number), map(string)));

  expect(eq({key: '1'}, {key: '1'})).toBe(true);
  expect(eq({key: '1'}, {key: '1', key2: 'a'})).toBe(false);

  expect(eq({key: 1}, {key: 1})).toBe(true);
  expect(eq({key: 1}, {key: 2})).toBe(false);
  expect(eq('a', 'a')).toBe(true);
  expect(eq('a', 'b')).toBe(false);
  expect(eq([], [])).toBe(true);
  expect(eq([1], [1])).toBe(true);
  expect(eq([1, 2], [1, 2])).toBe(true);
  expect(eq([1, 2], [1])).toBe(false);
  expect(eq([0], [1])).toBe(false);
  expect(eq(1, 1)).toBe(true);
  expect(eq(1, 2)).toBe(false);
});