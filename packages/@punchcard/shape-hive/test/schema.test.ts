import { array, Description, integer, map, number, Record, set, string } from '@punchcard/shape';
import { char, double, float, glue, varchar } from '../lib';

import Glue = require('../lib');

// tslint:disable: member-access

class Nested extends Record('Nested', {
  name: string
}) {}

class Data extends Record('Data', {
  id: string
    .apply(Description('this is a comment')),

  nested: Nested,

  int: integer,
  num: number,
  double,
  float,

  array: array(string),
  set: set(string),
  map: map(string),

  char: char(10),
  varchar: varchar(10),
}) {}

const schema = Glue.schema(Data);

test('Glue Schema from Shape', () => {
  expect(schema).toEqual({
    id: {
      name: 'id',
      comment: 'this is a comment',
      type: glue.Schema.STRING
    },
    nested: {
      name: 'nested',
      type: glue.Schema.struct([{
        name: 'name',
        type: glue.Schema.STRING
      }])
    },
    int: {
      name: 'int',
      type: glue.Schema.INTEGER
    },
    num: {
      name: 'num',
      type: glue.Schema.DOUBLE
    },
    double: {
      name: 'double',
      type: glue.Schema.DOUBLE
    },
    float: {
      name: 'float',
      type: glue.Schema.FLOAT
    },
    array: {
      name: 'array',
      type: glue.Schema.array(glue.Schema.STRING)
    },
    set: {
      name: 'set',
      type: glue.Schema.array(glue.Schema.STRING)
    },
    map: {
      name: 'map',
      type: glue.Schema.map(glue.Schema.STRING, glue.Schema.STRING)
    },
    char: {
      name: 'char',
      type: glue.Schema.char(10)
    },
    varchar: {
      name: 'varchar',
      type: glue.Schema.varchar(10)
    }
  });

  // compile-time test
  const expected: {
    id: {
      name: 'id',
      comment: 'this is a comment',
      type: glue.Type;
    },
    nested: {
      name: 'nested',
      type: glue.Type;
      comment?: undefined;
    },
    int: {
      name: 'int',
      type: glue.Type;
      comment?: undefined;
    },
    num: {
      name: 'num',
      type: glue.Type;
      comment?: undefined;
    },
    double: {
      name: 'double',
      type: glue.Type;
      comment?: undefined;
    },
    float: {
      name: 'float',
      type: glue.Type;
      comment?: undefined;
    },
    array: {
      name: 'array',
      type: glue.Type;
      comment?: undefined;
    },
    set: {
      name: 'set',
      type: glue.Type;
      comment?: undefined;
    },
    map: {
      name: 'map',
      type: glue.Type;
      comment?: undefined;
    },
    char: {
      name: 'char',
      type: glue.Type;
      comment?: undefined;
    },
    varchar: {
      name: 'varchar',
      type: glue.Type;
      comment?: undefined;
    }
  } = schema;
});
