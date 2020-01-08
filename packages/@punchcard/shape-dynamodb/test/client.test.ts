import 'jest';

import sinon = require('sinon');

import { any, array, map, number, string } from '@punchcard/shape';
import { DSL } from '../lib';
import { Table } from '../lib/client';

// tslint:disable: member-access
class Type {
  key = string;
  count = number;
  list = array(string);
  dict = map(string);
  dynamic = any;
}

const table = new Table(Type, ['key', 'count'], {
  tableArn: 'my-table-arn'
});

// leaving this here as a compile time test for now

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
    list: ['a', 'b'],
    dict: {
      key: 'value'
    },
    dynamic: 'dynamic-value'
  }, _ => _.count.equals(1).and(_.list[0].lessThanOrEqual(0)).and(_.dict.a.equals('value')));

  expect(putItem.args[0][0]).toEqual({
    TableName: 'my-table-arn',
    Item: {
      key: { S: 'key' },
      count: { N: '1' },
      list: { L: [ {S: 'a'}, {S: 'b'} ] },
      dict: { M: { key: { S: 'value' } } },
      dynamic: { S: 'dynamic-value' }
    },
    ConditionExpression: '((#1=1 AND #2[0]<=0) AND #3.#4=:1)',
    ExpressionAttributeNames: {
      '#1': 'count',
      '#2': 'list',
      '#3': 'dict',
      '#4': 'a'
    },
    ExpressionAttributeValues: {
      ':1': { S: 'value' }
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
    item.list.push('item'),
    item.dynamic.as(string).set('dynamic-value')
  ]);

  expect(updateItem.args[0][0]).toEqual({
    TableName: 'my-table-arn',
    Key: {
      key: { S: 'key' },
      count: { N: '1' },
    },
    UpdateExpression: 'SET #1[1]=:1 SET #2=:2',
    ExpressionAttributeNames: {
      '#1': 'list',
      '#2': 'dynamic'
    },
    ExpressionAttributeValues: {
      ':1': { S: 'item' },
      ':2': { S: 'dynamic-value' }
    }
  });
});