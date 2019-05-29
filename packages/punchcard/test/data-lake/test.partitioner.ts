import 'jest';

import events = require('@aws-cdk/aws-events-targets');
import { Database } from '@aws-cdk/aws-glue';
import s3 = require('@aws-cdk/aws-s3');
import cdk = require('@aws-cdk/cdk');
import { integer, string, Table } from '../../lib';
import { setRuntime } from '../../lib/constants';
import { Partitioner } from '../../lib/data-lake/partitioner';

import sinon = require('sinon');
import { Compression } from '../../lib/storage/glue/compression';

setRuntime();

async function compressionTest(compression: Compression) {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'stack');

  const database = new Database(stack, 'database', {
    databaseName: 'database-name'
  });
  const table = new Table(stack, 'table', {
    database,
    tableName: 'table-name',
    compression,
    columns: {
      key: string()
    },
    partitions: {
      year: integer()
    },
    partitioner: () => ({
      year: 2019
    }),
  });

  const sourceBucket = new s3.Bucket(stack, 'SourceBucket');

  const partitioner = new Partitioner(stack, 'Partitioner', {
    sourceBucket,
    sourceCompression: Compression.None,
    table,
  });

  const sourceMock = {
    getObject: sinon.fake.returns(Promise.resolve({
      Body: new Buffer(await compression.compress(new Buffer(JSON.stringify({
        key: 'key'
      }), 'utf8')))
    }))
  };
  const tableMock = {
    write: sinon.fake.returns(Promise.resolve())
  };

  await partitioner.processor.handle({
    Records: [{
      s3: {
        object: {
          key: 'key',
          eTag: 'etag',
          size: 1,
          sequencer: 'sequencer'
        },
      }
    } as any, {
      s3: {
        object: {
          key: 'key2',
          eTag: 'etag',
          size: 1,
          sequencer: 'sequencer'
        },
      }
    } as any]
  }, [sourceMock as any, tableMock as any], {});

  expect(sourceMock.getObject.args[0][0]).toEqual({
    Key: 'key',
    IfMatch: 'etag'
  });
  expect(sourceMock.getObject.args[1][0]).toEqual({
    Key: 'key2',
    IfMatch: 'etag'
  });
  expect(tableMock.write.args[0][0]).toEqual([{
    key: 'key'
  }, {
    key: 'key'
  }]);
}

it('Compression(None): parse records from objects and write to table', async () => {
  compressionTest(Compression.None);
});
it('Compression(Gzip): parse records from objects and write to table', async () => {
  compressionTest(Compression.Gzip);
});
it('Compression(Zip): parse records from objects and write to table', async () => {
  compressionTest(Compression.Zip);
});

const app = new cdk.App();
const stack = new cdk.Stack(app, 'stack');

const database = new Database(stack, 'database', {
  databaseName: 'database-name'
});
const table = new Table(stack, 'table', {
  database,
  tableName: 'table-name',
  s3Prefix: 's3Prefix',
  columns: {
    key: string()
  },
  partitions: {
    year: integer()
  },
  partitioner: () => ({
    year: 2019
  }),
});

const sourceBucket = new s3.Bucket(stack, 'SourceBucket');

const partitioner = new Partitioner(stack, 'Partitioner', {
  sourceBucket,
  sourceCompression: Compression.None,
  table
});

it('should throw Error if s3.getObject fails', async () => {
  const sourceMock = {
    getObject: sinon.fake.throws(new Error('error'))
  };
  const tableMock = {
    write: sinon.fake.returns(Promise.resolve())
  };

  expect.assertions(1);

  try {
    await partitioner.processor.handle({
      Records: [{
        s3: {
          object: {
            key: 'key',
            eTag: 'etag',
            size: 1,
            sequencer: 'sequencer'
          },
        }
      } as any]
    }, [sourceMock as any, tableMock as any], {});
  } catch (err) {
    expect(err).toEqual(new Error('error'));
  }
});

it('should throw Error if table.write fails', async () => {
  const sourceMock = {
    getObject: sinon.fake.returns({
      Body: new Buffer(JSON.stringify({
        key: 'key'
      }), 'utf8')
    })
  };
  const tableMock = {
    write: sinon.fake.returns(Promise.reject(new Error('error')))
  };

  expect.assertions(1);

  try {
    await partitioner.processor.handle({
      Records: [{
        s3: {
          object: {
            key: 'key',
            eTag: 'etag',
            size: 1,
            sequencer: 'sequencer'
          },
        }
      } as any]
    }, [sourceMock as any, tableMock as any], {});
  } catch (err) {
    expect(err).toEqual(new Error('error'));
  }
});

// it('should subscribe to sourceBucket onPutObject', () => {
//   const sourceBucket = {
//     bucketName: 'bucketName',
//     onPutObject: sinon.fake(),
//     grantRead: sinon.fake()
//   };
//   const partitioner = new Partitioner(stack, 'OnPutTest', {
//     table,
//     sourceCompression: Compression.None,
//     sourceBucket: sourceBucket as any
//   });

//   expect(sourceBucket.onPutObject.args[0]).toEqual([
//     'OnPutObject',
//     new events.LambdaFunction(partitioner.processor),
//     table.s3Prefix
//   ]);
//   expect(sourceBucket.grantRead.calledOnce).toBe(true);
//   expect(sourceBucket.grantRead.args[0][0]).toEqual(partitioner.processor);
// });
