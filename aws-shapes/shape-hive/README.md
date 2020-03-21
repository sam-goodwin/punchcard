# @punchcard/shape-hive

Maps a Punchcard Shape Record to its corresponding Hive Schema compatible with AWS Glue.

# Define a Schema with a Record

```ts
import { string, integer, number, array, set, map, Description } from '@punchcard/shape';

// Hive-specific types
import { double, float, char, varchar, Glue } from '@punchcard/shape-hive';

// a record to be used within our top-level type (i.e. a nested structure).
class Nested extends Record({
  name: string
}) {}

class Data extends Record({
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
```

# Map the Type to its corresponding Hive Schema

```ts
const schema = Glue.schema(Data);

expect(schema).toEqual({
  id: {
    name: 'id',
    comment: 'this is a comment', // the comment comes from the Description trait
    type: glue.Schema.STRING
  },
  nested: {
    // nested types are mapped to a struct
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
    // char and varchar constraints are supported
    name: 'char',
    type: glue.Schema.char(10)
  },
  varchar: {
    name: 'varchar',
    type: glue.Schema.varchar(10)
  }
});
```

