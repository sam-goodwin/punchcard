import {Optional, Record, number, string} from "@punchcard/shape";
import {array, map, set} from "@punchcard/shape/lib/collection";
import {JsonPath} from "../lib";

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

  complexArray: array(Nested),

  complexMap: map(Nested),
  count: number.apply(Optional),
  id: string,
  map: map(string),
  nested: Nested,
  numberSet: set(number),
  stringSet: set(string),
}) {}

const _ = JsonPath.of(MyType);

test(`$['id']`, () => {
  const jp = _.id;
  expect(JsonPath.compile(jp)).toStrictEqual(`$['id']`);
});

test(`$.array[?(@=='value')]`, () => {
  const jp = _.array.filter((_) => _.equals("value"));
  expect(JsonPath.compile(jp)).toStrictEqual(`$['array'][?(@=='value')]`);
});

test(`$['complexArray'][?(@['a']=='value')]`, () => {
  const jp = _.complexArray.filter((_) => _.a.equals("value"));
  expect(JsonPath.compile(jp)).toStrictEqual(
    `$['complexArray'][?(@['a']=='value')]`,
  );
});

test(`$['map']['item']`, () => {
  const jp = _.map.get("item");
  expect(JsonPath.compile(jp)).toStrictEqual(`$['map']['item']`);
});

test(`$.map[?(@=='value')]`, () => {
  const jp = _.map.filter((_) => _.equals("value"));
  expect(JsonPath.compile(jp)).toStrictEqual(`$['map'][?(@=='value')]`);
});

test(`$['complexMap'][?(@['a']=='value')]`, () => {
  const jp = _.complexMap.filter((_) => _.a.equals("value"));
  expect(JsonPath.compile(jp)).toStrictEqual(
    `$['complexMap'][?(@['a']=='value')]`,
  );
});
