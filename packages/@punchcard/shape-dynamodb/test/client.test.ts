import 'jest';

import sinon = require('sinon');

import { any, array, map, number, Record, string } from '@punchcard/shape';
import { DynamoDBClient } from '../lib/client';

// tslint:disable: member-access
class Type extends Record({
  key: string,
  count: number,
  list: array(string),
  dict: map(string),
  dynamic: any,
}) {}

const hashTable = new DynamoDBClient(Type, 'key', {
  tableName: 'my-table-name'
});

const sortedTable = new DynamoDBClient(Type, ['key', 'count'], {
  tableName: 'my-table-name'
});
// leaving this here as a compile time test for now

function mockClient(fake: { [K in keyof AWS.DynamoDB]?: sinon.SinonSpy; }) {
  (sortedTable as any).client = fake;
  (hashTable as any).client = fake;
  return fake;
}

test('getItem', async () => {
  const getItemPromise = sinon.fake.resolves({
    Item: {
      key: { S: 'value' },
      count: { N: '1' },
      list: { L: [ {S: 'list value'} ] },
      dict: { M: { key: { S: 'string' } } },
      dynamic: { S: 'value' }
    }
  });
  const getItem = sinon.fake.returns({ promise: getItemPromise });
  const client = mockClient({
    getItem
  });

  const hkResult = await hashTable.get('value');
  const skResult = await sortedTable.get(['value', 1]);

  expect(hkResult).toEqual(skResult);
  expect(skResult).toEqual(new Type({
    key: 'value',
    count: 1,
    list: ['list value'],
    dict: { key: 'string' },
    dynamic: 'value'
  }));

  expect(getItem.args[0][0]).toEqual({
    TableName: 'my-table-name',
    Key: {
      key: { S: 'value' }
    }
  });
  expect(getItem.args[1][0]).toEqual({
    TableName: 'my-table-name',
    Key: {
      key: { S: 'value' },
      count: { N: '1' }
    }
  });
});

test('put-if', async () => {
  const putItemPromise = sinon.fake.resolves(null as any);
  const putItem = sinon.fake.returns({ promise: putItemPromise });
  const client = mockClient({
    putItem
  });

  await sortedTable.put(new Type({
    key: 'key',
    count: 1,
    list: ['a', 'b'],
    dict: {
      key: 'value'
    },
    dynamic: 'dynamic-value'
  }), {
    if: _ => _.count.equals(1).and(_.list[0].lessThanOrEqual(0)).and(_.dict.a.equals('value'))
  });

  expect(putItem.args[0][0]).toEqual({
    TableName: 'my-table-name',
    Item: {
      key: { S: 'key' },
      count: { N: '1' },
      list: { L: [ {S: 'a'}, {S: 'b'} ] },
      dict: { M: { key: { S: 'value' } } },
      dynamic: { S: 'dynamic-value' }
    },
    ConditionExpression: '((#1=:1 AND #2[0]<=:2) AND #3.#4=:3)',
    ExpressionAttributeNames: {
      '#1': 'count',
      '#2': 'list',
      '#3': 'dict',
      '#4': 'a'
    },
    ExpressionAttributeValues: {
      ':1': { N: '1' },
      ':2': { N: '0' },
      ':3': { S: 'value' }
    }
  });
});

test('update', async () => {
  const updateItemPromise = sinon.fake.resolves(null as any);
  const updateItem = sinon.fake.returns({ promise: updateItemPromise });
  mockClient({
    updateItem
  });

  await sortedTable.update(['key', 1], {
    actions: item => [
      item.list.push('item'),
      item.dynamic.as(string).set('dynamic-value'),
      item.count.set(item.count.plus(1)),
      item.count.increment()
    ]
  });

  expect(updateItem.args[0][0]).toEqual({
    TableName: 'my-table-name',
    Key: {
      key: { S: 'key' },
      count: { N: '1' },
    },
    UpdateExpression: 'SET #1[1]=:1 SET #2=:2 SET #3=#3+:3 SET #3=#3+:4',
    ExpressionAttributeNames: {
      '#1': 'list',
      '#2': 'dynamic',
      '#3': 'count'
    },
    ExpressionAttributeValues: {
      ':1': { S: 'item' },
      ':2': { S: 'dynamic-value' },
      ':3': { N: '1' },
      ':4': { N: '1' }
    }
  });
});

test('update-if', async () => {
  const updateItemPromise = sinon.fake.resolves(null as any);
  const updateItem = sinon.fake.returns({ promise: updateItemPromise });
  mockClient({
    updateItem
  });

  await sortedTable.update(['key', 1], {
    actions: item => [
      item.list.push('item'),
      item.dynamic.as(string).set('dynamic-value'),
      item.count.set(item.count.plus(1)),
      item.count.increment()
    ],
    if: item => item.key.exists()
  });

  expect(updateItem.args[0][0]).toEqual({
    TableName: 'my-table-name',
    Key: {
      key: { S: 'key' },
      count: { N: '1' },
    },
    UpdateExpression: 'SET #1[1]=:1 SET #2=:2 SET #3=#3+:3 SET #3=#3+:4',
    ConditionExpression: 'attribute_exists(#4)',
    ExpressionAttributeNames: {
      '#1': 'list',
      '#2': 'dynamic',
      '#3': 'count',
      '#4': 'key'
    },
    ExpressionAttributeValues: {
      ':1': { S: 'item' },
      ':2': { S: 'dynamic-value' },
      ':3': { N: '1' },
      ':4': { N: '1' }
    }
  });
});
