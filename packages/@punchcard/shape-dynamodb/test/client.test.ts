import 'jest';

import sinon = require('sinon');

import { array, number, string } from '@punchcard/shape';
import { Table } from '../lib/client';

// tslint:disable: member-access
class Type {
  key = string;
  count = number;
  list = array(string);
}

const table = new Table(Type, ['key', 'count'], {
  tableArn: 'my-table-arn'
});

// leaving this here as a compile time test for now
async function testDDB() {
  const a = await table.get(['a', 1]);

  await table.put({
    key: 'key',
    count: 1,
    list: ['a', 'b']
  });

  await table.putIf({
    key: 'key',
    count: 1,
    list: ['a', 'b']
  }, _ => _.count.equals(1));

  await table.query(['key', _ => _.greaterThan(1)]);
}

function mockClient(fake: { [K in keyof AWS.DynamoDB]?: sinon.SinonSpy; }) {
  (table as any).client = fake;
  return fake;
}

test('getItem', async () => {
  const getItemPromise = sinon.fake.resolves({
    Item: {
      key: { S: 'value' },
      count: { N: '1' },
      list: { L: [ {S: 'list value'} ] }
    }
  });
  const getItem = sinon.fake.returns({ promise: getItemPromise });
  const client = mockClient({
    getItem
  });

  const result = await table.get(['value', 1]);

  expect(result).toEqual({
    key: 'value',
    count: 1,
    list: ['list value']
  });

  expect(getItem.args[0][0]).toEqual({
    TableName: 'my-table-arn',
    Key: {
      key: { S: 'value' },
      count: { N: '1' }
    }
  });
});

test('putIf', async () => {
  const putItemPromise = sinon.fake.resolves(null as any);
  const putItem = sinon.fake.returns({ promise: putItemPromise });
  const client = mockClient({
    putItem
  });

  await table.putIf({
    key: 'key',
    count: 1,
    list: ['a', 'b']
  }, _ => _.count.equals(1));

  expect(putItem.args[0][0]).toEqual({
    TableName: 'my-table-arn',
    Item: {
      key: { S: 'key' },
      count: { N: '1' },
      list: { L: [ {S: 'a'}, {S: 'b'} ] }
    },
    ConditionExpression: '#1=:1',
    ExpressionAttributeNames: {
      '#1': 'count'
    },
    ExpressionAttributeValues: {
      ':1': { N: '1' }
    }
  });
});

test('update', async () => {
  const updateItemPromise = sinon.fake.resolves(null as any);
  const updateItem = sinon.fake.returns({ promise: updateItemPromise });
  mockClient({
    updateItem
  });

  await table.update(['key', 1], item => [
    item.list.push('item')
  ]);

  expect(updateItem.args[0][0]).toEqual({
    TableName: 'my-table-arn',
    Key: {
      key: { S: 'key' },
      count: { N: '1' },
    },
    UpdateExpression: 'SET #1[:1] = :2',
    ExpressionAttributeNames: {
      '#1': 'list'
    },
    ExpressionAttributeValues: {
      ':1': { N: '1' },
      ':2': { S: 'item' }
    }
  });
});