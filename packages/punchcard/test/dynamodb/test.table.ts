import 'jest';

import AWS = require('aws-sdk');
import sinon = require('sinon');

import dynamodb = require('@aws-cdk/aws-dynamodb');
import iam = require('@aws-cdk/aws-iam');
import core = require('@aws-cdk/core');
import { array, binary, integer, map, Optional, Record, set, Shape, string, timestamp } from '@punchcard/shape';
import { bigint, double, float, smallint, tinyint } from '@punchcard/shape-glue';
import { Core, DynamoDB } from '../../lib';
import { Build } from '../../lib/core/build';
import { Run } from '../../lib/core/run';

class Struct extends Record({
  key: string
}) {}

function keyTypeTests(makeTable: (type: Shape) => void) {
  it('should accept string partition key', () => {
    makeTable(string);
  });
  it('should accept integer partition key', () => {
    makeTable(integer);
  });
  it('should accept bigint partition key', () => {
    makeTable(bigint);
  });
  it('should accept smallint partition key', () => {
    makeTable(smallint);
  });
  it('should accept tinyint partition key', () => {
    makeTable(tinyint);
  });
  it('should accept float partition key', () => {
    makeTable(float);
  });
  it('should accept double partition key', () => {
    makeTable(double);
  });
  it('should accept timestamp partition key', () => {
    makeTable(timestamp);
  });
  it('should accept binary partition key', () => {
    makeTable(binary);
  });
  it('should not accept optional', () => {
    expect(() =>  makeTable(string.apply(Optional))).toThrow();
  });
  it('should not accept array', () => {
    expect(() =>  makeTable(array(string))).toThrow();
  });
  it('should not accept set', () => {
    expect(() =>  makeTable(set(string))).toThrow();
  });
  it('should not accept map', () => {
    expect(() =>  makeTable(map(string))).toThrow();
  });
  it('should not accept class', () => {
    expect(() =>  makeTable(Shape.of(Struct))).toThrow();
  });
}

// tests for installing the table into an RunTarget
function installTests(makeTable: (stack: Build<core.Stack>) => DynamoDB.Table<any, any>) {
  function installTest(getRun: (t: DynamoDB.Table<any, any>) => Core.Dependency<any>, expectedGrant: keyof dynamodb.Table) {
    const app = Build.lazy(() => new core.App({
      autoSynth: false
    }));
    const stack = app.map(app => new core.Stack(app, 'stack'));

    const table = makeTable(stack);
    const tableSpy = Build.resolve(table.resource.map(table => sinon.spy(table, expectedGrant)));

    const role = Build.resolve(stack.map(stack => new iam.Role(stack, 'Role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    })));
    const assembly = new Core.Assembly({});
    Build.resolve(getRun(table).install)(assembly, role);
    const tableConstruct = Build.resolve(table.resource);

    expect(assembly.get('tableName')).toEqual(tableConstruct.tableName);
    expect(tableSpy.calledWith(role)).toEqual(true);
    tableSpy.restore();
  }
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
function bootstrapTests(makeTable: (stack: Build<core.Stack>) => DynamoDB.Table<any, any>) {
  it('should lookup tableName from properties', async () => {
    const table = makeTable(Build.of(new core.Stack(new core.App({ autoSynth: false }), 'hello')));
    const bag = new Core.Assembly({});
    const cache = new Core.Cache();
    bag.set('tableName', 'table-name');
    const client = await Run.resolve(table.readAccess().bootstrap.map(bootstrap => bootstrap(bag, cache)));
    expect((client as any).tableName).toEqual('table-name');
  });
  it('should create and cache dynamo client', async () => {
    const table = makeTable(Build.of(new core.Stack(new core.App({ autoSynth: false }), 'hello')));
    const bag = new Core.Assembly({});
    const cache = new Core.Cache();
    bag.set('tableName', 'table-name');
    await Run.resolve(table.readAccess().bootstrap.map(bootstrap => bootstrap(bag, cache)));
    expect(cache.has('aws:dynamodb')).toBe(true);
  });
  it('should use cached dynamo client', async () => {
    const ddbClientConstructor = sinon.spy(AWS, 'DynamoDB');

    const table = makeTable(Build.of(new core.Stack(new core.App({ autoSynth: false }), 'hello')));
    const bag = new Core.Assembly({});
    const cache = new Core.Cache();
    bag.set('tableName', 'table-name');
    await Run.resolve(table.readAccess().bootstrap.map(bootstrap => bootstrap(bag, cache)));
    await Run.resolve(table.readAccess().bootstrap.map(bootstrap => bootstrap(bag, cache)));
    expect(ddbClientConstructor.calledOnce).toEqual(true);

    ddbClientConstructor.restore();
  });
}

describe('DynamoDB.Table', () => {
  describe('partition key must be S, N or B', () => {
    keyTypeTests(type => {
      const stack = Build.of(new core.Stack(new core.App(), 'stack'));

      class Data extends Record({
        key: type
      }) {}
      const table = new DynamoDB.Table(stack, 'table', Data, 'key');
      expect(table.key).toEqual({
        key: type
      });
      Build.resolve(table.resource);
    });
  });
  function boringTable(stack?: Build<core.Stack>) {
    stack = stack || Build.of(new core.Stack(new core.App(), 'stack'));

    class Data extends Record({
      key: string
    }) {}
    return new DynamoDB.Table(stack, 'table', Data, 'key');
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
      const stack = Build.of(new core.Stack(new core.App(), 'stack'));
      class Data extends Record({
        key: type,
        sortKey: type
      }) {}
      const table = new DynamoDB.Table(stack, 'table', Data, ['key', 'sortKey']);
      expect(table.key).toEqual({
        key: type,
        sortKey: type
      });
      Build.resolve(table.resource);
    });
  });
  function boringTable(stack: Build<core.Stack>) {
    class Data extends Record({
      key: string,
      sortKey: string
    }) {}
    const table = new DynamoDB.Table(stack, 'table', Data, ['key', 'sortKey']);
    Build.resolve(table.resource);
    return table;
  }
  describe('install', () => {
    installTests(boringTable);
  });
  describe('bootstrap', () => {
    bootstrapTests(boringTable);
  });
});