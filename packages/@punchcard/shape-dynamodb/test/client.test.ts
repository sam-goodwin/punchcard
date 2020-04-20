import 'jest';

import sinon = require('sinon');

import { any, array, map, number, optional, Record, string, union } from '@punchcard/shape';
import { TableClient } from '../lib/client';

// tslint:disable: member-access
class Type extends Record('Type', {
  key: string,
  count: number,
  list: array(string),
  dict: map(string),
  dynamic: any,
  optional: optional(string),
  union: union(string, number)
}) {}

const hashTable = new TableClient({
  tableName: 'my-table-name',
  data: Type,
  key: {
    partition: 'key'
  },
});

const sortedTable = new TableClient({
  tableName: 'my-table-name',
  data: Type,
  key: {
    partition: 'key',
    sort: 'count'
  },
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
      dynamic: { S: 'value' },
      optional: { S: 'optional' },
      union: { N: '1' }
    }
  });
  const getItem = sinon.fake.returns({ promise: getItemPromise });
  const client = mockClient({
    getItem
  });

  const hkResult = await hashTable.get({ key: 'value' });
  const skResult = await sortedTable.get({ key: 'value', count: 1});

  expect(hkResult).toEqual(skResult);
  expect(skResult).toEqual(new Type({
    key: 'value',
    count: 1,
    list: ['list value'],
    dict: { key: 'string' },
    dynamic: 'value',
    optional: 'optional',
    union: 1
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
    dynamic: 'dynamic-value',
    optional: 'optional',
    union: 1
  }), {
    if: _ => _.count.equals(1).and(_.list[0].lessThanOrEqual(0)).and(_.dict.get('a').equals('value'))
  });

  expect(putItem.args[0][0]).toEqual({
    TableName: 'my-table-name',
    Item: {
      key: { S: 'key' },
      count: { N: '1' },
      list: { L: [ {S: 'a'}, {S: 'b'} ] },
      dict: { M: { key: { S: 'value' } } },
      dynamic: { S: 'dynamic-value' },
      optional: { S: 'optional' },
      union: { N: '1' }
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

  await sortedTable.update({
    key: 'key',
    count: 1
  }, {
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
    UpdateExpression: 'SET #1[1]=:1, #2=:2, #3=#3+:3, #3=#3+:4',
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

  await sortedTable.update({
    key: 'key',
    count: 1
  }, {
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
    UpdateExpression: 'SET #1[1]=:1, #2=:2, #3=#3+:3, #3=#3+:4',
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

test('query', async () => {
  const queryPromise = sinon.fake.resolves({});
  const query = sinon.fake.returns({ promise: queryPromise });
  mockClient({
    query
  });

  await sortedTable.query({
    key: 'key',
    count: _ => _.greaterThan(0)
  });

  expect(query.args[0][0]).toEqual({
    TableName: 'my-table-name',
    KeyConditionExpression: '(#1=:1 AND #2>:2)',
    ExpressionAttributeNames: {
      '#1': 'key',
      '#2': 'count'
    },
    ExpressionAttributeValues: {
      ':1': { S: 'key' },
      ':2': { N: '0' }
    }
  });
});