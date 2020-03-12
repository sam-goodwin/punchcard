import 'jest';
import { any, binary, number, Record, Shape, string, timestamp, unknown } from '../lib';
import { array, map, set } from '../lib/collection';
import { ShapeGuards } from '../lib/guards';

test('isDynamicShape', () => {
  expect(ShapeGuards.isDynamicShape(any)).toBe(true);
  expect(ShapeGuards.isDynamicShape(unknown)).toBe(true);
  expect(ShapeGuards.isDynamicShape(number)).toBe(false);
});

test('isAnyShape', () => {
  expect(ShapeGuards.isAnyShape(any)).toBe(true);
  expect(ShapeGuards.isAnyShape(unknown)).toBe(false);
  expect(ShapeGuards.isAnyShape(number)).toBe(false);
});

test('isUnknownShape', () => {
  expect(ShapeGuards.isUnknownShape(unknown)).toBe(true);
  expect(ShapeGuards.isUnknownShape(any)).toBe(false);
  expect(ShapeGuards.isUnknownShape(number)).toBe(false);
});

test('isBinaryShape', () => {
  expect(ShapeGuards.isBinaryShape(binary)).toBe(true);
  expect(ShapeGuards.isBinaryShape(number)).toBe(false);
});

test('isStringShape', () => {
  expect(ShapeGuards.isStringShape(string)).toBe(true);
  expect(ShapeGuards.isStringShape(number)).toBe(false);
});

test('isNumberShape', () => {
  expect(ShapeGuards.isNumberShape(number)).toBe(true);
  expect(ShapeGuards.isNumberShape(string)).toBe(false);
});

test('isTimestampShape', () => {
  expect(ShapeGuards.isTimestampShape(timestamp)).toBe(true);
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

class MyClass extends Record({
  key: string
}) {}

test('isRecordShape', () => {
  expect(ShapeGuards.isRecordShape(MyClass)).toBe(true);
  expect(ShapeGuards.isRecordShape(string)).toBe(false);
});