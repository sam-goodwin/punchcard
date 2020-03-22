import {Record, any, binary, number, string, timestamp, unknown} from "../lib";
import {array, map, set} from "../lib/collection";
import {ShapeGuards} from "../lib/guards";

describe("guards", () => {
  it("isDynamicShape", () => {
    expect.assertions(3);
    expect(ShapeGuards.isDynamicShape(any)).toBe(true);
    expect(ShapeGuards.isDynamicShape(unknown)).toBe(true);
    expect(ShapeGuards.isDynamicShape(number)).toBe(false);
  });

  it("isAnyShape", () => {
    expect.assertions(3);
    expect(ShapeGuards.isAnyShape(any)).toBe(true);
    expect(ShapeGuards.isAnyShape(unknown)).toBe(false);
    expect(ShapeGuards.isAnyShape(number)).toBe(false);
  });

  it("isUnknownShape", () => {
    expect.assertions(3);
    expect(ShapeGuards.isUnknownShape(unknown)).toBe(true);
    expect(ShapeGuards.isUnknownShape(any)).toBe(false);
    expect(ShapeGuards.isUnknownShape(number)).toBe(false);
  });

  it("isBinaryShape", () => {
    expect.assertions(2);
    expect(ShapeGuards.isBinaryShape(binary)).toBe(true);
    expect(ShapeGuards.isBinaryShape(number)).toBe(false);
  });

  it("isStringShape", () => {
    expect.assertions(2);
    expect(ShapeGuards.isStringShape(string)).toBe(true);
    expect(ShapeGuards.isStringShape(number)).toBe(false);
  });

  it("isNumberShape", () => {
    expect.assertions(2);
    expect(ShapeGuards.isNumberShape(number)).toBe(true);
    expect(ShapeGuards.isNumberShape(string)).toBe(false);
  });

  it("isTimestampShape", () => {
    expect.assertions(2);
    expect(ShapeGuards.isTimestampShape(timestamp)).toBe(true);
    expect(ShapeGuards.isTimestampShape(string)).toBe(false);
  });

  it("isArrayShape", () => {
    expect.assertions(2);
    expect(ShapeGuards.isArrayShape(array(string))).toBe(true);
    expect(ShapeGuards.isArrayShape(set(string))).toBe(false);
    expect(ShapeGuards.isArrayShape(string)).toBe(false);
  });

  it("isSetShape", () => {
    expect.assertions(3);
    expect(ShapeGuards.isSetShape(set(string))).toBe(true);
    expect(ShapeGuards.isSetShape(array(string))).toBe(false);
    expect(ShapeGuards.isSetShape(string)).toBe(false);
  });

  it("isMapShape", () => {
    expect.assertions(3);
    expect(ShapeGuards.isMapShape(map(string))).toBe(true);
    expect(ShapeGuards.isMapShape(array(string))).toBe(false);
    expect(ShapeGuards.isMapShape(string)).toBe(false);
  });

  class MyClass extends Record({
    key: string,
  }) {}

  it("isRecordShape", () => {
    expect.assertions(2);
    expect(ShapeGuards.isRecordShape(MyClass)).toBe(true);
    expect(ShapeGuards.isRecordShape(string)).toBe(false);
  });
});
