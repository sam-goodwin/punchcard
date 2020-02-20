import 'jest';

import { number, Optional, Record, string } from '@punchcard/shape';
import { array, map, set } from '@punchcard/shape/lib/collection';

import '../lib';
import { JsonPath } from '../lib';

// tslint:disable: member-access
export class Nested extends Record({
  /**
   * This is a nested string.
   */
  a: string
}) {}

export class MyType extends Record({
  /**
   * Field documentation.
   */
  id: string,

  count: number
    .apply(Optional),

  nested: Nested,
  array: array(string),
  complexArray: array(Nested),
  stringSet: set(string),
  numberSet: set(number),
  map: map(string),
  complexMap: map(Nested)
}) {}

const _ = JsonPath.of(MyType);

test(`$['id']`, () => {
  const  jp = _.id;
  expect(JsonPath.compile(jp)).toEqual(`$['id']`);
});

test(`$.array[?(@=='value')]`, () => {
  const jp = _.array.filter(_ => _.equals('value'));
  expect(JsonPath.compile(jp)).toEqual(`$['array'][?(@=='value')]`);
});

test(`$.array[?(@=='value')]`, () => {
  const jp = _.array.filter(_ => _.equals('value'));
  expect(JsonPath.compile(jp)).toEqual(`$['array'][?(@=='value')]`);
});

test(`$['complexArray'][?(@['a']=='value')]`, () => {
  const jp = _.complexArray.filter(_ => _.a.equals('value'));
  expect(JsonPath.compile(jp)).toEqual(`$['complexArray'][?(@['a']=='value')]`);
});

test(`$['map']['item']`, () => {
  const jp = _.map.item;
  expect(JsonPath.compile(jp)).toEqual(`$['map']['item']`);
});

test(`$.map[?(@=='value')]`, () => {
  const jp = _.map.filter(_ => _.equals('value'));
  expect(JsonPath.compile(jp)).toEqual(`$['map'][?(@=='value')]`);
});

test(`$['complexMap'][?(@['a']=='value')]`, () => {
  const jp = _.complexMap.filter(_ => _.a.equals('value'));
  expect(JsonPath.compile(jp)).toEqual(`$['complexMap'][?(@['a']=='value')]`);
});
