import sinon = require('sinon');

import iam = require('@aws-cdk/aws-iam');
import core = require('@aws-cdk/core');
import AWS = require('aws-sdk');
import 'jest';
// tslint:disable-next-line: max-line-length
import { Core, DynamoDB, Shape } from '../../lib';

const scope: any = {
  node: {
    uniqueId: 'test'
  }
};

function keyTypeTests(makeTable: (type: Shape.Shape<any>) => void) {
  it('should accept string partition key type', () => {
    makeTable(Shape.string());
  });
  it('should accept integer partition key type', () => {
    makeTable(Shape.integer());
  });
  it('should accept bigint partition key type', () => {
    makeTable(Shape.bigint());
  });
  it('should accept smallint partition key type', () => {
    makeTable(Shape.smallint());
  });
  it('should accept tinyint partition key type', () => {
    makeTable(Shape.tinyint());
  });
  it('should accept float partition key type', () => {
    makeTable(Shape.float());
  });
  it('should accept double partition key type', () => {
    makeTable(Shape.double());
  });
  it('should accept timestamp partition key type', () => {
    makeTable(Shape.timestamp);
  });
  it('should accept binary partition key type', () => {
    makeTable(Shape.binary());
  });
  it('should not accept optional type', () => {
    expect(() =>  makeTable(Shape.optional(Shape.string()))).toThrow();
  });
  it('should not accept array type', () => {
    expect(() =>  makeTable(Shape.array(Shape.string()))).toThrow();
  });
  it('should not accept set type', () => {
    expect(() =>  makeTable(Shape.set(Shape.string()))).toThrow();
  });
  it('should not accept map type', () => {
    expect(() =>  makeTable(Shape.map(Shape.string()))).toThrow();
  });
  it('should not accept struct type', () => {
    expect(() =>  makeTable(Shape.struct({
      key: Shape.string()
    }))).toThrow();
  });
}

// tests for installing the table into an RunTarget
function installTests(makeTable: (stack: core.Stack) => DynamoDB.Table<any, any, any>) {
  function installTest(getRun: (t: DynamoDB.Table<any, any, any>) => Core.Dependency<any>, expectedGrant: keyof DynamoDB.Table<any, any, any>) {
    const stack = new core.Stack(new core.App(), 'stack');
    const table = makeTable(stack);
    const tableSpy = sinon.spy(table, expectedGrant);
    const role = new iam.Role(stack, 'Role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });
    const assembly = new Core.Assembly(scope, {});
    getRun(table).install(assembly, role);
    expect(assembly.get('tableName')).toEqual(table.tableName);
    expect(tableSpy.calledWith(role)).toEqual(true);
    tableSpy.restore();
  }
  it('default client grants readWriteData', () => {
    installTest(t => t, 'grantReadWriteData');
  });
  it('readData', () => {
    installTest(t => t.readAccess(), 'grantReadData');
  });
  it('readWriteData', () => {
    installTest(t => t.readWriteAccess(), 'grantReadWriteData');
  });
  it('writeData', () => {
    installTest(t => t.writeAccess(), 'grantWriteData');
  });
  it('fullAccess', () => {
    installTest(t => t.fullAccess(), 'grantFullAccess');
  });
}

// tests for bootstrapping a runnable client from a property bag
function bootstrapTests(makeTable: (stack: core.Stack) => DynamoDB.Table<any, any, any>) {
  it('should lookup tableName from properties', async () => {
    const table = makeTable(new core.Stack(new core.App(), 'hello'));
    const bag = new Core.Assembly(scope, {});
    const cache = new Core.Cache();
    bag.set('tableName', 'table-name');
    const client = await table.bootstrap(bag, cache);
    expect((client as any).tableName).toEqual('table-name');
  });
  it('should create and cache dynamo client', async () => {
    const table = makeTable(new core.Stack(new core.App(), 'hello'));
    const bag = new Core.Assembly(scope, {});
    const cache = new Core.Cache();
    bag.set('tableName', 'table-name');
    await table.bootstrap(bag, cache);
    expect(cache.has('aws:dynamodb')).toBe(true);
  });
  it('should use cached dynamo client', async () => {
    const ddbClientConstructor = sinon.spy(AWS, 'DynamoDB');

    const table = makeTable(new core.Stack(new core.App(), 'hello'));
    const bag = new Core.Assembly(scope, {});
    const cache = new Core.Cache();
    bag.set('tableName', 'table-name');
    await table.bootstrap(bag, cache);
    await table.bootstrap(bag, cache);
    expect(ddbClientConstructor.calledOnce).toEqual(true);

    ddbClientConstructor.restore();
  });
}

describe('DynamoDB.Table', () => {
  describe('partition key must be S, N or B', () => {
    keyTypeTests(type => {
      const stack = new core.Stack(new core.App(), 'stack');
      const table = new DynamoDB.Table(stack, 'table', {
        shape: {
          key: type
        },
        partitionKey: 'key',
        sortKey: undefined
      });
      expect(table.key).toEqual({
        key: type
      });
    });
  });
  function boringTable(stack?: core.Stack) {
    stack = stack || new core.Stack(new core.App(), 'stack');
    return new DynamoDB.Table(stack, 'table', {
      shape: {
        key: Shape.string()
      },
      partitionKey: 'key',
      sortKey: undefined
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
      const stack = new core.Stack(new core.App(), 'stack');
      const table = new DynamoDB.Table(stack, 'table', {
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
  function boringTable(stack: core.Stack) {
    return new DynamoDB.Table(stack, 'table', {
      shape: {
        key: Shape.string(),
        sortKey: Shape.string()
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