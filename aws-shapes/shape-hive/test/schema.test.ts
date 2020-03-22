import {
  Description,
  Record,
  array,
  integer,
  map,
  number,
  set,
  string,
} from "@punchcard/shape";
import {char, double, float, glue, varchar} from "../lib";

import Glue from "../lib";

class Nested extends Record({
  name: string,
}) {}

class Data extends Record({
  array: array(string),

  char: char(10),

  double,
  float,
  id: string.apply(Description("this is a comment")),
  int: integer,

  map: map(string),
  nested: Nested,
  num: number,

  set: set(string),
  varchar: varchar(10),
}) {}

const schema = Glue.schema(Data);

test("glue Schema from Shape", () => {
  expect(schema).toStrictEqual({
    array: {
      name: "array",
      type: glue.Schema.array(glue.Schema.STRING),
    },
    char: {
      name: "char",
      type: glue.Schema.char(10),
    },
    double: {
      name: "double",
      type: glue.Schema.DOUBLE,
    },
    float: {
      name: "float",
      type: glue.Schema.FLOAT,
    },
    id: {
      comment: "this is a comment",
      name: "id",
      type: glue.Schema.STRING,
    },
    int: {
      name: "int",
      type: glue.Schema.INTEGER,
    },
    map: {
      name: "map",
      type: glue.Schema.map(glue.Schema.STRING, glue.Schema.STRING),
    },
    nested: {
      name: "nested",
      type: glue.Schema.struct([
        {
          name: "name",
          type: glue.Schema.STRING,
        },
      ]),
    },
    num: {
      name: "num",
      type: glue.Schema.DOUBLE,
    },
    set: {
      name: "set",
      type: glue.Schema.array(glue.Schema.STRING),
    },
    varchar: {
      name: "varchar",
      type: glue.Schema.varchar(10),
    },
  });

  // compile-time test
  const expected: {
    array: {
      comment?: undefined;
      name: "array";
      type: glue.Type;
    };
    char: {
      comment?: undefined;
      name: "char";
      type: glue.Type;
    };
    double: {
      comment?: undefined;
      name: "double";
      type: glue.Type;
    };
    float: {
      comment?: undefined;
      name: "float";
      type: glue.Type;
    };
    id: {
      comment: "this is a comment";
      name: "id";
      type: glue.Type;
    };
    int: {
      comment?: undefined;
      name: "int";
      type: glue.Type;
    };
    map: {
      comment?: undefined;
      name: "map";
      type: glue.Type;
    };
    nested: {
      comment?: undefined;
      name: "nested";
      type: glue.Type;
    };
    num: {
      comment?: undefined;
      name: "num";
      type: glue.Type;
    };
    set: {
      comment?: undefined;
      name: "set";
      type: glue.Type;
    };
    varchar: {
      comment?: undefined;
      name: "varchar";
      type: glue.Type;
    };
  } = schema;
});
