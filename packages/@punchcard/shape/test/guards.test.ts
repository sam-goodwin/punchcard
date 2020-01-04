import 'jest';
import { number, Shape, string, timestamop } from '../lib';
import { array, map, set } from '../lib/collection';
import { ShapeGuards } from '../lib/guards';

test('isStringShape', () => {
  expect(ShapeGuards.isStringShape(string)).toBe(true);
  expect(ShapeGuards.isStringShape(number)).toBe(false);
});

test('isNumberShape', () => {
  expect(ShapeGuards.isNumberShape(number)).toBe(true);
  expect(ShapeGuards.isNumberShape(string)).toBe(false);
});

test('isTimestampShape', () => {
  expect(ShapeGuards.isTimestampShape(timestamop)).toBe(true);
  expect(ShapeGuards.isTimestampShape(string)).toBe(false);
});

test('isArrayShape', () => {
  expect(ShapeGuards.isArrayShape(array(string))).toBe(true);
  expect(ShapeGuards.isArrayShape(set(string))).toBe(false);
  expect(ShapeGuards.isArrayShape(string)).toBe(false);
});

test('isSetShape', () => {
  expect(ShapeGuards.isSetShape(set(string))).toBe(true);
  expect(ShapeGuards.isSetShape(array(string))).toBe(false);
  expect(ShapeGuards.isSetShape(string)).toBe(false);
});

test('isMapShape', () => {
  expect(ShapeGuards.isMapShape(map(string))).toBe(true);
  expect(ShapeGuards.isMapShape(array(string))).toBe(false);
  expect(ShapeGuards.isMapShape(string)).toBe(false);
});

class MyClass {
  // tslint:disable-next-line: member-access
  key = string;
}

test('isClassShape', () => {
  expect(ShapeGuards.isClassShape(Shape.of(MyClass))).toBe(true);
  expect(ShapeGuards.isClassShape(string)).toBe(false);
});