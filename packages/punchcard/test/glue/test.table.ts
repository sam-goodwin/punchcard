import glue = require('@aws-cdk/aws-glue');
import core = require('@aws-cdk/core');

import 'jest';

import { array, binary, bool, integer, map, Record, Shape, string, timestamp } from '@punchcard/shape';
import { Glue, } from '../../lib';
import { Build } from '../../lib/core/build';
// tslint:disable-next-line: ordered-imports
import { bigint, tinyint, smallint, char, varchar, float, double, DataType } from '@punchcard/shape-hive';

class Struct extends Record('Struct', {
  a: integer
}) {}

class MyTable extends Record('MyTable', {
  boolean: bool,
  binary,
  str: string,
  timestamp,
  int: integer,
  smallint,
  tinyint,
  bigint,
  float,
  double,
  char: char(10),
  varchar: varchar(10),
  array: array(string),
  map: map(string),
  struct: Struct,
}) {}

it('should map columns and partition keys to their respective types', () => {
  const stack = Build.of(new core.Stack(new core.App({ autoSynth: false}), 'stack'));
  const database = stack.map(stack => new glue.Database(stack, 'Database', {
    databaseName: 'database'
  }));

  const table = new Glue.Table(stack, 'Table', {
    database,
    tableName: 'table_name',
    columns: MyTable,
    partition: {
      keys: Glue.Partition.Monthly,
      get: v => Glue.Partition.byMonth(v.timestamp)
    }
  });

  expect(Build.resolve(table.resource).dataFormat).toEqual(glue.DataFormat.JSON);
  expect(Build.resolve(table.resource).columns).toEqual([{
    name: 'boolean',
    type: {
      inputString: 'boolean',
      isPrimitive: true
    }
  }, {
    name: 'binary',
    type: {
      inputString: 'binary',
      isPrimitive: true
    }
  }, {
    name: 'str',
    type: {
      inputString: 'string',
      isPrimitive: true
    }
  }, {
    name: 'timestamp',
    type: {
      inputString: 'timestamp',
      isPrimitive: true
    }
  }, {
    name: 'int',
    type: {
      inputString: 'int',
      isPrimitive: true
    }
  }, {
    name: 'smallint',
    type: {
      inputString: 'smallint',
      isPrimitive: true
    }
  }, {
    name: 'tinyint',
    type: {
      inputString: 'tinyint',
      isPrimitive: true
    }
  }, {
    name: 'bigint',
    type: {
      inputString: 'bigint',
      isPrimitive: true
    }
  }, {
    name: 'float',
    type: {
      inputString: 'float',
      isPrimitive: true
    }
  }, {
    name: 'double',
    type: {
      inputString: 'double',
      isPrimitive: true
    }
  }, {
    name: 'char',
    type: {
      inputString: 'char(10)',
      isPrimitive: true
    }
  }, {
    name: 'varchar',
    type: {
      inputString: 'varchar(10)',
      isPrimitive: true
    }
  }, {
    name: 'array',
    type: {
      inputString: 'array<string>',
      isPrimitive: false
    }
  }, {
    name: 'map',
    type: {
      inputString: 'map<string,string>',
      isPrimitive: false
    }
  }, {
    name: 'struct',
    type: {
      inputString: 'struct<a:int>',
      isPrimitive: false
    }
  }]);
  expect(Build.resolve(table.resource).partitionKeys).toEqual([{
    name: 'year',
    type: {
      inputString: 'int',
      isPrimitive: true
    }
  }, {
    name: 'month',
    type: {
      inputString: 'int',
      isPrimitive: true
    }
  }]);
});

it('should default to Json Codec', () => {
  const stack = Build.of(new core.Stack(new core.App(), 'stack'));
  const database = stack.map(stack => new glue.Database(stack, 'Database', {
    databaseName: 'database'
  }));

  const table = new Glue.Table(stack, 'Table', {
    database,
    tableName: 'table_name',
    columns: MyTable,
    partition: {
      keys: Glue.Partition.Monthly,
      get: v => new Glue.Partition.Monthly({
        year: v.timestamp.getUTCFullYear(),
        month: v.timestamp.getUTCMonth()
      })
    }
  });

  expect(table.dataType).toEqual(DataType.Json);
  expect(Build.resolve(table.resource).dataFormat).toEqual(glue.DataFormat.JSON);
});

function partitionTest(type: Shape): void {
  const stack = Build.of(new core.Stack(new core.App({ autoSynth: false }), 'stack'));
  const database = stack.map(stack => new glue.Database(stack, 'Database', {
    databaseName: 'database'
  }));

  const table = new Glue.Table(stack, 'Table', {
    database,
    tableName: 'table_name',
    columns: MyTable,
    partition: {
      keys: Glue.Partition.Monthly,
      get: v => new Glue.Partition.Monthly({
        year: v.timestamp.getUTCFullYear(),
        month: v.timestamp.getUTCMonth()
      })
    }
  });

  Build.resolve(table.resource);
}

it('should not throw if valid partition key type', () => {
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
