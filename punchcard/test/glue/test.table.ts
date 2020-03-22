import * as glue from "@aws-cdk/aws-glue";
import * as core from "@aws-cdk/core";
import {
  Record,
  Shape,
  array,
  binary,
  bool,
  integer,
  map,
  string,
  timestamp,
} from "@punchcard/shape";
import {Glue} from "../../src";
import {Build} from "../../src/core/build";
import {
  DataType,
  bigint,
  char,
  double,
  float,
  smallint,
  tinyint,
  varchar,
} from "@punchcard/shape-hive";

class Struct extends Record({
  a: integer,
}) {}

class MyTable extends Record({
  array: array(string),
  bigint,
  binary,
  boolean: bool,
  char: char(10),
  double,
  float,
  int: integer,
  map: map(string),
  smallint,
  str: string,
  struct: Struct,
  timestamp,
  tinyint,
  varchar: varchar(10),
}) {}

test("should map columns and partition keys to their respective types", () => {
  const stack = Build.of(
    new core.Stack(new core.App({autoSynth: false}), "stack"),
  );
  const database = stack.map(
    (stack) =>
      new glue.Database(stack, "Database", {
        databaseName: "database",
      }),
  );

  const table = new Glue.Table(stack, "Table", {
    columns: MyTable,
    database,
    partition: {
      get: (v) => Glue.Partition.byMonth(v.timestamp),
      keys: Glue.Partition.Monthly,
    },
    tableName: "table_name",
  });

  expect(Build.resolve(table.resource).dataFormat).toStrictEqual(
    glue.DataFormat.Json,
  );
  expect(Build.resolve(table.resource).columns).toStrictEqual([
    {
      name: "boolean",
      type: {
        inputString: "boolean",
        isPrimitive: true,
      },
    },
    {
      name: "binary",
      type: {
        inputString: "binary",
        isPrimitive: true,
      },
    },
    {
      name: "str",
      type: {
        inputString: "string",
        isPrimitive: true,
      },
    },
    {
      name: "timestamp",
      type: {
        inputString: "timestamp",
        isPrimitive: true,
      },
    },
    {
      name: "int",
      type: {
        inputString: "int",
        isPrimitive: true,
      },
    },
    {
      name: "smallint",
      type: {
        inputString: "smallint",
        isPrimitive: true,
      },
    },
    {
      name: "tinyint",
      type: {
        inputString: "tinyint",
        isPrimitive: true,
      },
    },
    {
      name: "bigint",
      type: {
        inputString: "bigint",
        isPrimitive: true,
      },
    },
    {
      name: "float",
      type: {
        inputString: "float",
        isPrimitive: true,
      },
    },
    {
      name: "double",
      type: {
        inputString: "double",
        isPrimitive: true,
      },
    },
    {
      name: "char",
      type: {
        inputString: "char(10)",
        isPrimitive: true,
      },
    },
    {
      name: "varchar",
      type: {
        inputString: "varchar(10)",
        isPrimitive: true,
      },
    },
    {
      name: "array",
      type: {
        inputString: "array<string>",
        isPrimitive: false,
      },
    },
    {
      name: "map",
      type: {
        inputString: "map<string,string>",
        isPrimitive: false,
      },
    },
    {
      name: "struct",
      type: {
        inputString: "struct<a:int>",
        isPrimitive: false,
      },
    },
  ]);
  expect(Build.resolve(table.resource).partitionKeys).toStrictEqual([
    {
      name: "year",
      type: {
        inputString: "int",
        isPrimitive: true,
      },
    },
    {
      name: "month",
      type: {
        inputString: "int",
        isPrimitive: true,
      },
    },
  ]);
});

test("should default to Json Codec", () => {
  const stack = Build.of(new core.Stack(new core.App(), "stack"));
  const database = stack.map(
    (stack) =>
      new glue.Database(stack, "Database", {
        databaseName: "database",
      }),
  );

  const table = new Glue.Table(stack, "Table", {
    columns: MyTable,
    database,
    partition: {
      get: (v) =>
        new Glue.Partition.Monthly({
          month: v.timestamp.getUTCMonth(),
          year: v.timestamp.getUTCFullYear(),
        }),
      keys: Glue.Partition.Monthly,
    },
    tableName: "table_name",
  });

  expect(table.dataType).toStrictEqual(DataType.Json);
  expect(Build.resolve(table.resource).dataFormat).toStrictEqual(
    glue.DataFormat.Json,
  );
});

function partitionTest(type: Shape): void {
  const stack = Build.of(
    new core.Stack(new core.App({autoSynth: false}), "stack"),
  );
  const database = stack.map(
    (stack) =>
      new glue.Database(stack, "Database", {
        databaseName: "database",
      }),
  );

  const table = new Glue.Table(stack, "Table", {
    columns: MyTable,
    database,
    partition: {
      get: (v) =>
        new Glue.Partition.Monthly({
          month: v.timestamp.getUTCMonth(),
          year: v.timestamp.getUTCFullYear(),
        }),
      keys: Glue.Partition.Monthly,
    },
    tableName: "table_name",
  });

  Build.resolve(table.resource);
}

test("should not throw if valid partition key type", () => {
  partitionTest(bool);
  partitionTest(timestamp);
  partitionTest(string);
  partitionTest(integer);
  partitionTest(smallint);
  partitionTest(tinyint);
  partitionTest(float);
  partitionTest(double);
  partitionTest(char(10));
  partitionTest(varchar(10));
});
