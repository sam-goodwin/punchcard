import core = require('@aws-cdk/core');
import AWS = require('aws-sdk');
import 'jest';
import { DynamoDB, Shape, string } from '../../../lib';

describe('HashTable', () => {
  function makeTable<S extends Shape, P extends keyof S>(shape: S, partitionKey: P, mock: AWS.DynamoDB): DynamoDB.HashTableClientImpl<S, P> {
    const app = new core.App();
    const stack = new core.Stack(app, 'stack');
    return new DynamoDB.HashTableClientImpl(new DynamoDB.HashTable(stack, 'table', {
      shape,
      partitionKey
    }), 'tableName', mock);
  }
  test('get should serialize string key and deserialize response', async () => {
    let request: AWS.DynamoDB.GetItemInput = undefined as any;
    const mock = {
      getItem: (_request: AWS.DynamoDB.GetItemInput) => {
        request = _request;
        return {
          promise: () => Promise.resolve({
            Item: {
              key: { S: 'hello' },
              value: { S: 'value' }
            }
          })
        };
      }
    };
    const table = makeTable({
      key: string(),
      value: string(),
    }, 'key', mock as any);

    const result = await table.get({
      key: 'hello'
    });
    expect(result).toEqual({
      key: 'hello',
      value: 'value'
    });
    expect(request).toEqual({
      TableName: 'tableName',
      Key: {
        key: {
          S: 'hello'
        }
      }
    });
  });

  test('batchGet should serialize string key and deserialize response', async () => {
    let request: AWS.DynamoDB.BatchGetItemInput = undefined as any;
    const mock = {
      batchGetItem: (_request: AWS.DynamoDB.BatchGetItemInput) => {
        request = _request;
        return {
          promise: () => Promise.resolve({
            Responses: {
              tableName: [{
                Item: {
                  key: { S: 'hello' },
                  value: { S: 'value' }
                }
              }, {
                Item: {
                  key: { S: 'hello2' },
                  value: { S: 'value' }
                }
              }]
            }
          })
        };
      }
    };
    const table = makeTable({
      key: string(),
      value: string()
    }, 'key', mock as any);

    const result = await table.batchGet([{
      key: 'hello'
    }, {
      key: 'hello2'
    }]);
    expect(result).toEqual([{
      key: 'hello',
      value: 'value'
    }, {
      key: 'hello2',
      value: 'value'
    }]);
    expect(request).toEqual({
      RequestItems: {
        tableName: {
          Keys: [{
            key: {
              S: 'hello'
            }
          }, {
            key: {
              S: 'hello2'
            }
          }]
        }
      }
    });
  });

  test('scan should deserialize responses', async () => {
    let request: AWS.DynamoDB.ScanInput = undefined as any;
    const mock = {
      scan: (_request: AWS.DynamoDB.ScanInput) => {
        request = _request;
        return {
          promise: () => Promise.resolve({
            Items: [{
              key: { S: 'hello' },
              value: { S: 'value' }
            }, {
              key: { S: 'hello2' },
              value: { S: 'value' }
            }]
          })
        };
      }
    };
    const table = makeTable({
      key: string(),
      value: string()
    }, 'key', mock as any);

    const result = await table.scan();
    expect(request).toEqual({
      TableName: 'tableName'
    });
    expect(result).toEqual([{
      key: 'hello',
      value: 'value'
    }, {
      key: 'hello2',
      value: 'value'
    }]);
  });

  describe('put', () => {
    const response: AWS.DynamoDB.PutItemOutput = {
      ConsumedCapacity: {
        CapacityUnits: 1
      }
    };
    test('serializes item and makes PutRequest', async () => {
      let request: AWS.DynamoDB.PutItemInput = undefined as any;
      const mock = {
        putItem: (_request: AWS.DynamoDB.PutItemInput) => {
          request = _request;
          return {
            promise: () => Promise.resolve(response)
          };
        }
      };
      const table = makeTable({
        key: string(),
        value: string()
      }, 'key', mock as any);

      expect(await table.put({
        item: {
          key: 'keyValue',
          value: 'valueValue'
        }
      })).toEqual(response);
      expect(request).toEqual({
        TableName: 'tableName',
        Item: {
          key: { S: 'keyValue' },
          value: { S: 'valueValue' }
        }
      });
    });
    test('compiles and includes ConditionExpression', async () => {
      let request: AWS.DynamoDB.PutItemInput = undefined as any;
      const mock = {
        putItem: (_request: AWS.DynamoDB.PutItemInput) => {
          request = _request;
          return {
            promise: () => Promise.resolve(response)
          };
        }
      };
      const table = makeTable({
        key: string(),
        value: string()
      }, 'key', mock as any);

      expect(await table.put({
        item: {
          key: 'keyValue',
          value: 'valueValue'
        },
        if: item => item.value.equals('some-value')
      })).toEqual(response);
      expect(request).toEqual({
        TableName: 'tableName',
        Item: {
          key: { S: 'keyValue' },
          value: { S: 'valueValue' }
        },
        ConditionExpression: '#0 = :0',
        ExpressionAttributeNames: {
          '#0': 'value'
        },
        ExpressionAttributeValues: {
          ':0': { S: 'some-value' }
        }
      });
    });
  });

  describe('update', () => {
    const response: AWS.DynamoDB.UpdateItemOutput = {

    };
    test('renders and includes UpdateExpression', async () => {
      let request: AWS.DynamoDB.UpdateItemInput = undefined as any;
      const mock = {
        updateItem: (_request: AWS.DynamoDB.UpdateItemInput) => {
          request = _request;
          return {
            promise: () => Promise.resolve(response)
          };
        }
      };
      const table = makeTable({
        key: string(),
        value: string()
      }, 'key', mock as any);

      expect(await table.update({
        key: {
          key: 'some-key'
        },
        actions: ({value}) => [
          value.set('some-value')
        ]
      })).toEqual(response);
      expect(request).toEqual({
        TableName: 'tableName',
        Key: {
          key: { S: 'some-key' }
        },
        UpdateExpression: 'SET #0 = :0 ',
        ExpressionAttributeNames: {
          '#0': 'value'
        },
        ExpressionAttributeValues: {
          ':0': { S: 'some-value' }
        }
      });
    });
    test('renders and includes ConditionExpression', async () => {
      let request: AWS.DynamoDB.UpdateItemInput = undefined as any;
      const mock = {
        updateItem: (_request: AWS.DynamoDB.UpdateItemInput) => {
          request = _request;
          return {
            promise: () => Promise.resolve(response)
          };
        }
      };
      const table = makeTable({
        key: string(),
        value: string()
      }, 'key', mock as any);

      expect(await table.update({
        key: {
          key: 'some-key'
        },
        if: ({value}) => value.equals('is-some-value'),
        actions: ({value}) => [
          value.set('set-some-value')
        ]
      })).toEqual(response);
      expect(request).toEqual({
        TableName: 'tableName',
        Key: {
          key: { S: 'some-key' }
        },
        UpdateExpression: 'SET #0 = :0 ',
        ConditionExpression: '#0 = :1',
        ExpressionAttributeNames: {
          '#0': 'value'
        },
        ExpressionAttributeValues: {
          ':0': { S: 'set-some-value' },
          ':1': { S: 'is-some-value' }
        }
      });
    });
  });
});

describe('SortedTable', () => {
// tslint:disable-next-line: max-line-length
  function makeTable<S extends Shape, P extends keyof S, SK extends keyof S>(shape: S, partitionKey: P, sortKey: SK, mock: AWS.DynamoDB): DynamoDB.SortedTableClientImpl<S, P, SK> {
    const app = new core.App();
    const stack = new core.Stack(app, 'stack');
    return new DynamoDB.SortedTableClientImpl(new DynamoDB.SortedTable(stack, 'table', {
      shape,
      partitionKey,
      sortKey
    }), 'tableName', mock);
  }
  const shape = {
    key: string(),
    sortKey: string(),
    value: string()
  };
  const response: AWS.DynamoDB.QueryOutput = {
    Items: [{
      key: { S: 'some-key' },
      sortKey: { S: 'some-sort-key' },
      value: { S: 'some-value' }
    }]
  };
  async function mockRequest(query: DynamoDB.Query<typeof shape, 'key', 'sortKey'>) {
    let request: AWS.DynamoDB.QueryInput = undefined as any;
    const mock = {
      query: (_request: AWS.DynamoDB.QueryInput) => {
        request = _request;
        return {
          promise: () => Promise.resolve(response)
        };
      }
    };
    const table = makeTable(shape, 'key', 'sortKey', mock as any);

    const result = await table.query(query);
    return [request, result];
  }
  test('query renders and includes QueryExpression', async () => {
    const [request, result] = await mockRequest({
      key: { key: 'some-key' }
    });
    expect(result).toEqual([{
      key: 'some-key',
      sortKey: 'some-sort-key',
      value: 'some-value'
    }]);
    expect(request).toEqual({
      TableName: 'tableName',
      KeyConditionExpression: '#0 = :0',
      ExpressionAttributeNames: {
        '#0': 'key'
      },
      ExpressionAttributeValues: {
        ':0': { S: 'some-key' }
      }
    });
  });
  test('query renders and includes FilterExpression', async () => {
    const [request, result] = await mockRequest({
      key: { key: 'some-key' },
      filter: item => item.value.lessThan('some-value')
    });
    expect(result).toEqual([{
      key: 'some-key',
      sortKey: 'some-sort-key',
      value: 'some-value'
    }]);
    expect(request).toEqual({
      TableName: 'tableName',
      KeyConditionExpression: '#0 = :0',
      FilterExpression: '#1 < :1',
      ExpressionAttributeNames: {
        '#0': 'key',
        '#1': 'value'
      },
      ExpressionAttributeValues: {
        ':0': { S: 'some-key' },
        ':1': { S: 'some-value' }
      }
    });
  });
  test('query renders sortKey in ConditionExpression', async () => {
    const [request, result] = await mockRequest({
      key: {
        key: 'some-key',
        sortKey: DynamoDB.lessThan('some-value')
      }
    });
    expect(result).toEqual([{
      key: 'some-key',
      sortKey: 'some-sort-key',
      value: 'some-value'
    }]);
    expect(request).toEqual({
      TableName: 'tableName',
      KeyConditionExpression: '#0 = :0 AND #1 < :1',
      ExpressionAttributeNames: {
        '#0': 'key',
        '#1': 'sortKey'
      },
      ExpressionAttributeValues: {
        ':0': { S: 'some-key' },
        ':1': { S: 'some-value' }
      }
    });
  });
});
