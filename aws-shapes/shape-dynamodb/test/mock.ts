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

import "../lib";

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
  array: array(string),

  bool,
  binaryField: binary,
  complexArray: array(Nested),
  anyField: any,

  complexMap: map(Nested),
  binarySet: set(binary),
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
