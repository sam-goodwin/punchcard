import { Description, number, string } from '@punchcard/shape';
import { Glue } from '../lib';

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
    .apply(Glue.Partition());
}

const schema = Glue.table('DataTable', Data);

test('Glue Schema from Shape', () => {
  expect(schema).toEqual({
    name: 'DataTable',
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
      }
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
    name: 'DataTable',
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
      }
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
