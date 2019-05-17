import sinon = require('sinon');

import iam = require('@aws-cdk/aws-iam');
import cdk = require('@aws-cdk/cdk');
import AWS = require('aws-sdk');
import 'jest';
// tslint:disable-next-line: max-line-length
import { array, bigint, binary, double, float, HashTable, integer, map, optional, PropertyBag, RuntimePropertyBag, set, smallint, SortedTable, string, struct, Table, timestamp, tinyint, Type, Client } from '../../lib';

function keyTypeTests(makeTable: (type: Type<any>) => void) {
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
}

// tests for installing the table into an RunTarget
function installTests(makeTable: (stack: cdk.Stack) => Table<any, any, any>) {
  function installTest(getRun: (t: Table<any, any, any>) => Client<any>, expectedGrant: keyof Table<any, any, any>) {
    const stack = new cdk.Stack(new cdk.App(), 'stack');
    const table = makeTable(stack);
    const tableSpy = sinon.spy(table, expectedGrant);
    const role = new iam.Role(stack, 'Role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });
    const properties = new PropertyBag('test', {});
    getRun(table).install({
      grantable: role,
      properties
    });
    expect(properties.get('tableName')).toEqual(table.tableName);
    expect(tableSpy.calledWith(role)).toEqual(true);
  }
  it('default client grants readWriteData', () => {
    installTest(t => t, 'grantReadWriteData');
  });
  it('readData', () => {
    installTest(t => t.readData(), 'grantReadData');
  });
  it('readWriteData', () => {
    installTest(t => t.readWriteData(), 'grantReadWriteData');
  });
  it('writeData', () => {
    installTest(t => t.writeData(), 'grantWriteData');
  });
  it('fullAccess', () => {
    installTest(t => t.fullAccess(), 'grantFullAccess');
  });
}

// tests for bootstrapping a runnable client from a property bag
function bootstrapTests(makeTable: (stack: cdk.Stack) => Table<any, any, any>) {
  it('should lookup tableName from properties', () => {
    const table = makeTable(new cdk.Stack(new cdk.App(), 'hello'));
    const bag = new RuntimePropertyBag('test', {}, {});
    bag.set('tableName', 'table-name');
    const client = table.bootstrap(bag);
    expect((client as any).tableName).toEqual('table-name');
  });
  it('should create and cache dynamo client', () => {
    const table = makeTable(new cdk.Stack(new cdk.App(), 'hello'));
    const bag = new RuntimePropertyBag('test', {}, {});
    bag.set('tableName', 'table-name');
    table.bootstrap(bag);
    expect(bag.hasCache(Table.cacheKey)).toBe(true);
  });
  it('should use cached dynamo client', () => {
    const ddbClientConstructor = sinon.spy(AWS, 'DynamoDB');

    const table = makeTable(new cdk.Stack(new cdk.App(), 'hello'));
    const bag = new RuntimePropertyBag('test', {}, {});
    bag.set('tableName', 'table-name');
    table.bootstrap(bag);
    table.bootstrap(bag);
    expect(ddbClientConstructor.calledOnce).toEqual(true);

    ddbClientConstructor.restore();
  });
}

describe('HashTable', () => {
  describe('partition key must be S, N or B', () => {
    keyTypeTests(type => {
      const stack = new cdk.Stack(new cdk.App(), 'stack');
      const table = new HashTable(stack, 'table', {
        shape: {
          key: type
        },
        partitionKey: 'key'
      });
      expect(table.key).toEqual({
        key: type
      });
    });
  });
  function boringTable(stack?: cdk.Stack) {
    stack = stack || new cdk.Stack(new cdk.App(), 'stack');
    return new HashTable(stack, 'table', {
      shape: {
        key: string()
      },
      partitionKey: 'key'
    });
  }
  describe('install', () => {
    installTests(boringTable);
  });
  describe('bootstrap', () => {
    bootstrapTests(boringTable);
  });
});
describe('SortedTable', () => {
  describe('partition and sort keys must be S, N or B', () => {
    keyTypeTests(type => {
      const stack = new cdk.Stack(new cdk.App(), 'stack');
      const table = new SortedTable(stack, 'table', {
        shape: {
          key: type,
          sortKey: type
        },
        partitionKey: 'key',
        sortKey: 'sortKey'
      });
      expect(table.key).toEqual({
        key: type,
        sortKey: type
      });
    });
  });
  function boringTable(stack: cdk.Stack) {
    return new SortedTable(stack, 'table', {
      shape: {
        key: string(),
        sortKey: string()
      },
      partitionKey: 'key',
      sortKey: 'sortKey'
    });
  }
  describe('install', () => {
    installTests(boringTable);
  });
  describe('bootstrap', () => {
    bootstrapTests(boringTable);
  });
});