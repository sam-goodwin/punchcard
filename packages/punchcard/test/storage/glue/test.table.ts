import glue = require('@aws-cdk/aws-glue');
import core = require('@aws-cdk/core');

import 'jest';
import { array, bigint, binary, boolean, char, Codec, double, float, Glue, integer, map, smallint, string, struct, timestamp, tinyint, Type, varchar } from '../../../lib';

it('should map columns and partition keys to their respective types', () => {
  const stack = new core.Stack(new core.App(), 'stack');
  const database = new glue.Database(stack, 'Database', {
    databaseName: 'database'
  });

  const table = new Glue.Table(stack, 'Table', {
    database,
    codec: Codec.Json,
    tableName: 'table_name',
    columns: {
      boolean,
      binary: binary(),
      str: string(),
      timestamp,
      int: integer(),
      smallint: smallint(),
      tinyint: tinyint(),
      bigint: bigint(),
      float: float(),
      double: double(),
      char: char(10),
      varchar: varchar(10),
      array: array(string()),
      map: map(string()),
      struct: struct({
        a: integer()
      })
    },
    partition: {
      keys: {
        year: smallint(),
        month: smallint()
      },
      get: ({timestamp}) => ({
        year: timestamp.getUTCFullYear(),
        month: timestamp.getUTCMonth()
      })
    },
  });

  expect(table.resource.dataFormat).toEqual(glue.DataFormat.Json);
  expect(table.resource.columns).toEqual([{
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
  expect(table.resource.partitionKeys).toEqual([{
    name: 'year',
    type: {
      inputString: 'smallint',
      isPrimitive: true
    }
  }, {
    name: 'month',
    type: {
      inputString: 'smallint',
      isPrimitive: true
    }
  }]);
});

it('should default to Json Codec', () => {
  const stack = new core.Stack(new core.App(), 'stack');
  const database = new glue.Database(stack, 'Database', {
    databaseName: 'database'
  });

  const table = new Glue.Table(stack, 'Table', {
    database,
    tableName: 'table_name',
    columns: {
      str: string()
    },
    partition: {
      keys: {
        year: integer()
      },
      get: () => ({
        year: 1989
      })
    }
  });

  expect(table.codec).toEqual(Codec.Json);
  expect(table.resource.dataFormat).toEqual(glue.DataFormat.Json);
});

function partitionTest(type: Type<any>) {
  const stack = new core.Stack(new core.App(), 'stack');
  const database = new glue.Database(stack, 'Database', {
    databaseName: 'database'
  });

  new Glue.Table(stack, 'Table', {
    database,
    codec: Codec.Json,
    tableName: 'table_name',
    columns: {
      str: string()
    },
    partition: {
      keys: {
        year: type
      },
      get: () => ({
        year: 1989
      })
    }
  });
}

it('should not throw if valid partition key type', () => {
  partitionTest(boolean);
  partitionTest(timestamp);
  partitionTest(string());
  partitionTest(integer());
  partitionTest(smallint());
  partitionTest(tinyint());
  partitionTest(float());
  partitionTest(double());
  partitionTest(char(10));
  partitionTest(varchar(10));
});

it('should throw if invalid partition key type', () => {
  expect(() => partitionTest(binary())).toThrow();
  expect(() => partitionTest(struct({key: string()}))).toThrow();
  expect(() => partitionTest(array(string()))).toThrow();
  expect(() => partitionTest(map(string()))).toThrow();
});