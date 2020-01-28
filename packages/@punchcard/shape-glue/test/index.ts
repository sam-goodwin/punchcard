import { Description, number, Record, string } from '@punchcard/shape';
import Glue = require('../lib');

import glue = require('@aws-cdk/aws-glue');

// tslint:disable: member-access

class Nested extends Record({
  name: string
}) {}

class Data extends Record({
  id: string
    .apply(Description('this is an id')),

  nested: Nested,
}) {}

const schema = Glue.schema(Data);

test('Glue Schema from Shape', () => {
  expect(schema).toEqual({
    id: {
      name: 'id',
      comment: 'this is an id',
      type: glue.Schema.STRING
    },
    nested: {
      name: 'nested',
      type: glue.Schema.struct([{
        name: 'name',
        type: glue.Schema.STRING
      }]),
      comment: undefined
    },
  });

  // compile-time test
  const expected: {
    id: {
      name: 'id',
      comment: 'this is an id',
      type: glue.Type;
    },
    nested: {
      name: 'nested',
      type: glue.Type;
      comment?: undefined
    },
  } = schema;
});
