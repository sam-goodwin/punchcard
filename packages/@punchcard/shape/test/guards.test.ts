import 'jest';
import { any, binary, Enum, integer, isOptional, literal, nothing, number, optional, string, timestamp, Type, union } from '../lib';
import { array, map, set } from '../lib/collection';
import { ShapeGuards } from '../lib/guards';

test('isAnyShape', () => {
  expect(ShapeGuards.isAnyShape(any)).toBe(true);
  expect(ShapeGuards.isAnyShape(number)).toBe(false);
});

test('isEnumShape', () => {
  expect(ShapeGuards.isEnumShape(Enum({}))).toBe(true);
  expect(ShapeGuards.isEnumShape(number)).toBe(false);
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
test('isUnionShape', () => {
  expect(ShapeGuards.isUnionShape(union(string, integer))).toBe(true);
  expect(ShapeGuards.isUnionShape(string)).toBe(false);
});
test('isOptional', () => {
  expect(isOptional(integer)).toBe(false);
  expect(isOptional(union(string, integer))).toBe(false);
  expect(isOptional(union(nothing, integer))).toBe(true);
  expect(isOptional(optional(integer))).toBe(true);
});
test('isLiteral', () => {
  expect(ShapeGuards.isLiteralShape(literal(integer, 1))).toBe(true);
  expect(ShapeGuards.isLiteralShape(literal(1))).toBe(true);
  expect(ShapeGuards.isLiteralShape(literal('a'))).toBe(true);
  expect(ShapeGuards.isLiteralShape(integer)).toBe(false);
});

class MyClass extends Type('MyClass', {
  key: string
}) {}

test('isRecordShape', () => {
  expect(ShapeGuards.isRecordShape(MyClass)).toBe(true);
  expect(ShapeGuards.isRecordShape(string)).toBe(false);
});