import 'jest';

import { array, BoolShape, NumericShape, Record, RecordType, ShapeOrRecord, string, StringShape, TimestampShape, boolean } from '@punchcard/shape';

import { JsonPath } from '@punchcard/shape-jsonpath';

import VTL = require('../lib');

class A extends Record({
  /**
   * The key.
   */
  key: string,
  isA: boolean,
  items: array(string)
}) {}

const _ = VTL.dsl(A);

test('test', () => {
  const expression = _.items;

  const actual = VTL.synthesize(expression);

  expect(actual).toEqual('todo');

  VTL.If(_.items.get(0).equals('hello'), () => {
    _.items.set(0, _.key);
  }, VTL.Else(() => {

  }));

  return {
    
  }
});


