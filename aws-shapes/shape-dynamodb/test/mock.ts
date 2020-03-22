import "../lib";
import {
  Record,
  any,
  binary,
  bool,
  integer,
  number,
  optional,
  string,
  timestamp,
  unknown,
} from "@punchcard/shape";
import {array, map, set} from "@punchcard/shape/lib/collection";

export class Nested extends Record({
  /**
   * This is a nested string.
   */
  a: string,
}) {}

export class MyType extends Record({
  /**
   * Field documentation.
   */
  anyField: any,

  array: array(string),
  binaryField: binary,
  binarySet: set(binary),
  bool,

  complexArray: array(Nested),
  complexMap: map(Nested),
  count: optional(number),
  id: string,
  integer,
  map: map(string),
  nested: Nested,

  numberSet: set(number),
  stringSet: set(string),
  ts: timestamp,
  unknownField: unknown,
}) {}
