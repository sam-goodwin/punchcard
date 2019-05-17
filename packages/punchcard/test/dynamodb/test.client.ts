import cdk = require('@aws-cdk/cdk');
import AWS = require('aws-sdk');
import 'jest';
import { HashTable, HashTableClientImpl, Shape, string } from '../../lib';

describe('HashTable', () => {
  function makeTable<S extends Shape, P extends keyof S>(shape: S, partitionKey: P, mock: AWS.DynamoDB): HashTableClientImpl<S, P> {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'stack');
    return new HashTableClientImpl(new HashTable(stack, 'table', {
      shape,
      partitionKey
    }), 'tableName', mock);
  }
  describe('get', () => {
    it('should serialize string key and deserialize response', async () => {
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
        value: string()
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
  });
});
