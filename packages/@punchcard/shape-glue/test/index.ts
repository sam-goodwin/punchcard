import { Description, number, string } from '@punchcard/shape';
import Glue = require('../lib');

import glue = require('@aws-cdk/aws-glue');

// tslint:disable: member-access

class Nested {
  name = string;
}

class Data {
  id = string
    .apply(Description('this is an id'));

  nested = Nested;

  count = number
    .apply(Glue.Partition);
}

const schema = Glue.schema(Data);

test('Glue Schema from Shape', () => {
  expect(schema).toEqual({
    columns: {
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
    },
    partitionKeys: {
      count: {
        name: 'count',
        type: glue.Schema.DOUBLE,
        comment: undefined
      }
    }
  });

  // compile-time test
  const expected: {
    columns: {
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
    },
    partitionKeys: {
      count: {
        name: 'count',
        type: glue.Type;
        comment?: undefined
      }
    }
  } = schema;
});
