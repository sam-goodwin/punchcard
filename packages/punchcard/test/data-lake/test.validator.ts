import 'jest';

import { Database } from '@aws-cdk/aws-glue';
import cdk = require('@aws-cdk/cdk');
import { integer, string, Table } from '../../lib';
import { setRuntime } from '../../lib/constants';
import { Validator } from '../../lib/data-lake/validator';

setRuntime();

const app = new cdk.App();
const stack = new cdk.Stack(app, 'stack');

const database = new Database(stack, 'database', {
  databaseName: 'database-name'
});
const table = new Table(stack, 'table', {
  database,
  tableName: 'table-name',
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

const validator = new Validator(stack, 'Validator', {
  table
});

it('should return empty response if empty request', async () => {
  const response = await validator.processor.handle({
    records: []
  }, {}, {});
  expect(response).toEqual({
    records: []
  });
});

it('should parse and re-serialize records', async () => {
  const response = await validator.processor.handle({
    records: [{
      recordId: 'id1',
      data: new Buffer(JSON.stringify({
        key: 'key'
      })).toString('base64')
    }]
  }, {}, {});

  expect(response).toEqual({
    records: [{
      recordId: 'id1',
      data: new Buffer(JSON.stringify({
        key: 'key'
      }) + '\n').toString('base64'),
      result: 'Ok'
    }]
  });
});

it('should return invalid records as ProcessingFailed', async () => {
  const data = new Buffer(JSON.stringify({
    invalid: 'key'
  })).toString('base64');

  const response = await validator.processor.handle({
    records: [{
      recordId: 'id1',
      data
    }]
  }, {}, {});

  expect(response).toEqual({
    records: [{
      recordId: 'id1',
      data,
      result: 'ProcessingFailed'
    }]
  });
});
