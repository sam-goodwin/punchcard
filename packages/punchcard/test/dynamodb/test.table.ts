import cdk = require('@aws-cdk/cdk');
import AWS = require('aws-sdk');
import 'jest';
import { bigint, binary, double, float, HashTable, integer, smallint, string, timestamp, tinyint, Type, SortedTable, array, map, struct, set, optional } from '../../lib';

describe('HashTable', () => {
  describe('partition key must be S, N or B', () => {
    function makeTable(type: Type<any>) {
      const stack = new cdk.Stack(new cdk.App(), 'stack');
      new HashTable(stack, 'table', {
        shape: {
          key: type
        },
        partitionKey: 'key'
      });
    }
    it('should accept string partition key type', () => {
      makeTable(string());
    });
    it('should accept integer partition key type', () => {
      makeTable(integer());
    });
    it('should accept bigint partition key type', () => {
      makeTable(bigint());
    });
    it('should accept smallint partition key type', () => {
      makeTable(smallint());
    });
    it('should accept tinyint partition key type', () => {
      makeTable(tinyint());
    });
    it('should accept float partition key type', () => {
      makeTable(float());
    });
    it('should accept double partition key type', () => {
      makeTable(double());
    });
    it('should accept timestamp partition key type', () => {
      makeTable(timestamp);
    });
    it('should accept binary partition key type', () => {
      makeTable(binary());
    });
    it('should not accept optional type', () => {
      expect(() =>  makeTable(optional(string()))).toThrow();
    });
    it('should not accept array type', () => {
      expect(() =>  makeTable(array(string()))).toThrow();
    });
    it('should not accept set type', () => {
      expect(() =>  makeTable(set(string()))).toThrow();
    });
    it('should not accept map type', () => {
      expect(() =>  makeTable(map(string()))).toThrow();
    });
    it('should not accept struct type', () => {
      expect(() =>  makeTable(struct({
        key: string()
      }))).toThrow();
    });
  });
});
describe('SortedTable', () => {
  describe('partition and sort keys must be S, N or B', () => {
    function makeTable(type: Type<any>) {
      const stack = new cdk.Stack(new cdk.App(), 'stack');
      new SortedTable(stack, 'table', {
        shape: {
          key: type,
          sortKey: type
        },
        partitionKey: 'key',
        sortKey: 'sortKey'
      });
    }
    it('should accept string key types', () => {
      makeTable(string());
    });
    it('should accept integer key types', () => {
      makeTable(integer());
    });
    it('should accept bigint key types', () => {
      makeTable(bigint());
    });
    it('should accept smallint key types', () => {
      makeTable(smallint());
    });
    it('should accept tinyint key types', () => {
      makeTable(tinyint());
    });
    it('should accept float key types', () => {
      makeTable(float());
    });
    it('should accept double key types', () => {
      makeTable(double());
    });
    it('should accept timestamp key types', () => {
      makeTable(timestamp);
    });
    it('should accept binary key types', () => {
      makeTable(binary());
    });
    it('should not accept optional type', () => {
      expect(() =>  makeTable(optional(string()))).toThrow();
    });
    it('should not accept array type', () => {
      expect(() =>  makeTable(array(string()))).toThrow();
    });
    it('should not accept set type', () => {
      expect(() =>  makeTable(set(string()))).toThrow();
    });
    it('should not accept map type', () => {
      expect(() =>  makeTable(map(string()))).toThrow();
    });
    it('should not accept struct type', () => {
      expect(() =>  makeTable(struct({
        key: string()
      }))).toThrow();
    });
  });
});