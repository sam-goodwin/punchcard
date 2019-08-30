import glue = require('@aws-cdk/aws-glue');
import core = require('@aws-cdk/core');

import 'jest';
import { Glue, Shape, Util } from '../../lib';

it('should map columns and partition keys to their respective types', () => {
  const stack = new core.Stack(new core.App(), 'stack');
  const database = new glue.Database(stack, 'Database', {
    databaseName: 'database'
  });

  const table = new Glue.Table(stack, 'Table', {
    database,
    codec: Util.Codec.Json,
    tableName: 'table_name',
    columns: {
      boolean: Shape.boolean,
      binary: Shape.binary(),
      str: Shape.string(),
      timestamp: Shape.timestamp,
      int: Shape.integer(),
      smallint: Shape.smallint(),
      tinyint: Shape.tinyint(),
      bigint: Shape.bigint(),
      float: Shape.float(),
      double: Shape.double(),
      char: Shape.char(10),
      varchar: Shape.varchar(10),
      array: Shape.array(Shape.string()),
      map: Shape.map(Shape.string()),
      struct: Shape.struct({
        a: Shape.integer()
      })
    },
    partition: {
      keys: {
        year: Shape.smallint(),
        month: Shape.smallint()
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
      str: Shape.string()
    },
    partition: {
      keys: {
        year: Shape.integer()
      },
      get: () => ({
        year: 1989
      })
    }
  });

  expect(table.codec).toEqual(Util.Codec.Json);
  expect(table.resource.dataFormat).toEqual(glue.DataFormat.Json);
});

function partitionTest(type: Shape.Type<any>) {
  const stack = new core.Stack(new core.App(), 'stack');
  const database = new glue.Database(stack, 'Database', {
    databaseName: 'database'
  });

  new Glue.Table(stack, 'Table', {
    database,
    codec: Util.Codec.Json,
    tableName: 'table_name',
    columns: {
      str: Shape.string()
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
  partitionTest(Shape.boolean);
  partitionTest(Shape.timestamp);
  partitionTest(Shape.string());
  partitionTest(Shape.integer());
  partitionTest(Shape.smallint());
  partitionTest(Shape.tinyint());
  partitionTest(Shape.float());
  partitionTest(Shape.double());
  partitionTest(Shape.char(10));
  partitionTest(Shape.varchar(10));
});

it('should throw if invalid partition key type', () => {
  expect(() => partitionTest(Shape.binary())).toThrow();
  expect(() => partitionTest(Shape.struct({key: Shape.string()}))).toThrow();
  expect(() => partitionTest(Shape.array(Shape.string()))).toThrow();
  expect(() => partitionTest(Shape.map(Shape.string()))).toThrow();
});