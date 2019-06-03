import glue = require('@aws-cdk/aws-glue');
import cdk = require('@aws-cdk/cdk');

import 'jest';
import sinon = require('sinon');
import { Codec, smallint, Table, timestamp } from '../../../lib';
import { Bucket } from '../../../lib/storage/s3';

const stack = new cdk.Stack(new cdk.App(), 'stack');
const database = new glue.Database(stack, 'Database', {
  databaseName: 'database'
});

const table = new Table(stack, 'Table', {
  database,
  codec: Codec.Json,
  tableName: 'table_name',
  columns: {
    timestamp,
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
  }
});

function makeClient(glue: AWS.Glue, mockBucket?: Bucket.Client) {
  return new Table.Client(glue, 'catalogId', 'databaseName', 'tableName', table, mockBucket as any);
}

describe('getPartitions', () => {
  it('should getPartitions', async () => {
    const mock = {
      getPartitions: sinon.fake.returns({
        promise: () => Promise.resolve({
          Partitions: [{
            Values: ['2019', '1']
          }]
        })
      })
    };
    const client = makeClient(mock as any);

    const response = await client.getPartitions({
      Expression: 'expression'
    });

    expect(mock.getPartitions.calledOnce).toBe(true);
    expect(mock.getPartitions.args[0][0]).toEqual({
      CatalogId: 'catalogId',
      DatabaseName: 'databaseName',
      TableName: 'tableName',
      Expression: 'expression'
    });
    expect(response).toEqual({
      Partitions: [{
        Values: {
          year: 2019,
          month: 1
        }
      }]
    });
  });
  it('should pass other properties', async () => {
    const mock = {
      getPartitions: sinon.fake.returns({
        promise: () => Promise.resolve({
          Partitions: [{
            Values: ['2019', '1']
          }]
        })
      })
    };
    const client = makeClient(mock as any);

    const response = await client.getPartitions({
      Expression: 'expression',
      NextToken: 'token',
      MaxResults: 10,
      Segment: {
        SegmentNumber: 1,
        TotalSegments: 1
      }
    });

    expect(mock.getPartitions.calledOnce).toBe(true);
    expect(mock.getPartitions.args[0][0]).toEqual({
      CatalogId: 'catalogId',
      DatabaseName: 'databaseName',
      TableName: 'tableName',
      Expression: 'expression',
      NextToken: 'token',
      MaxResults: 10,
      Segment: {
        SegmentNumber: 1,
        TotalSegments: 1
      }
    });
    expect(response).toEqual({
      Partitions: [{
        Values: {
          year: 2019,
          month: 1
        }
      }]
    });
  });
});

it('should createPartition', async () => {
  const mock = {
    createPartition: sinon.fake.returns({promise: () => Promise.resolve('response') })
  };
  const client = makeClient(mock as any);

  await client.createPartition({
    Location: 's3://bucket/location',
    LastAccessTime: new Date(0),
    Partition: {
      year: 2019,
      month: 1
    }
  });

  expect(mock.createPartition.calledOnce).toBe(true);
  expect(mock.createPartition.args[0][0]).toEqual({
    CatalogId: 'catalogId',
    DatabaseName: 'databaseName',
    TableName: 'tableName',
    PartitionInput: {
      Values: ['2019', '1'],
      LastAccessTime: new Date(0),
      StorageDescriptor: {
        Compressed: false,
        Location: 's3://bucket/location',
        Columns: [{
          Name: 'timestamp',
          Type: 'timestamp'
        }],
        InputFormat: glue.DataFormat.Json.inputFormat.className,
        OutputFormat: glue.DataFormat.Json.outputFormat.className,
        SerdeInfo: {
          SerializationLibrary: glue.DataFormat.Json.serializationLibrary.className,
        }
      }
    }
  });
});

it('should batchCreatePartition', async () => {
  const mock = {
    batchCreatePartition: sinon.fake.returns({promise: () => Promise.resolve('response') })
  };
  const client = makeClient(mock as any);

  await client.batchCreatePartition([{
    Location: 's3://bucket/location',
    LastAccessTime: new Date(0),
    Partition: {
      year: 2019,
      month: 1
    }
  }]);

  expect(mock.batchCreatePartition.calledOnce).toBe(true);
  expect(mock.batchCreatePartition.args[0][0]).toEqual({
    CatalogId: 'catalogId',
    DatabaseName: 'databaseName',
    TableName: 'tableName',
    PartitionInputList: [{
      Values: ['2019', '1'],
      LastAccessTime: new Date(0),
      StorageDescriptor: {
        Compressed: false,
        Location: 's3://bucket/location',
        Columns: [{
          Name: 'timestamp',
          Type: 'timestamp'
        }],
        InputFormat: glue.DataFormat.Json.inputFormat.className,
        OutputFormat: glue.DataFormat.Json.outputFormat.className,
        SerdeInfo: {
          SerializationLibrary: glue.DataFormat.Json.serializationLibrary.className,
        }
      }
    }]
  });
});

it('should updatePartition', async () => {
  const mock = {
    updatePartition: sinon.fake.returns({promise: () => Promise.resolve('response') })
  };
  const client = makeClient(mock as any);

  await client.updatePartition({
    Partition: {
      year: 2019,
      month: 1
    },
    UpdatedPartition: {
      Location: 's3://bucket/location',
      LastAccessTime: new Date(0),
      Partition: {
        year: 2019,
        month: 2
      },
    }
  });

  expect(mock.updatePartition.calledOnce).toBe(true);
  expect(mock.updatePartition.args[0][0]).toEqual({
    CatalogId: 'catalogId',
    DatabaseName: 'databaseName',
    TableName: 'tableName',
    PartitionValueList: ['2019', '1'],
    PartitionInput: {
      Values: ['2019', '2'],
      LastAccessTime: new Date(0),
      StorageDescriptor: {
        Compressed: false,
        Location: 's3://bucket/location',
        Columns: [{
          Name: 'timestamp',
          Type: 'timestamp'
        }],
        InputFormat: glue.DataFormat.Json.inputFormat.className,
        OutputFormat: glue.DataFormat.Json.outputFormat.className,
        SerdeInfo: {
          SerializationLibrary: glue.DataFormat.Json.serializationLibrary.className,
        }
      }
    }
  });
});

describe('write', () => {
  it('should write object and partition', async () => {
    const mockTable = {
      createPartition: sinon.fake.returns({
        promise: () => Promise.resolve()
      })
    };
    const mockBucket = {
      bucketName: 'bucketName',
      putObject: sinon.fake.returns(Promise.resolve())
    };
    const client = makeClient(mockTable as any, mockBucket as any);
    const createPartitionSpy = sinon.spy(client, 'createPartition');
    await client.sink([{
      timestamp: new Date(Date.parse('2019-01-01T00:00:00.000Z'))
    }]);

    expect(mockBucket.putObject.calledOnce);
    expect(mockBucket.putObject.args[0][0]).toEqual({
      Body: Buffer.from(JSON.stringify({
        timestamp: '2019-01-01 00:00:00.000'
      }) + '\n', 'utf8'),
      Key: 'data/year=2019/month=0/af89373106045921d3c17f182d5669a34660100fa47eabd24fd3cd25751933e8.json'
    });

    expect(createPartitionSpy.calledOnce).toBe(true);
    expect(createPartitionSpy.args[0][0]).toEqual({
      Location: 's3://bucketName/data/year=2019/month=0/',
      Partition: {
        year: 2019,
        month: 0
      }
    });
  });
});