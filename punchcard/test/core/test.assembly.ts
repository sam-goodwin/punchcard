import 'jest';
import sinon = require('sinon');
import { Core } from '../../src';

const scope: any = {
  node: {
    uniqueId: 'test'
  }
};

describe('PropertyBag', () => {
  it('should append prefix keys when setting a value', () => {
    const bag = new Core.Assembly();
    bag.set('key', 'value');
    expect(bag.get('key')).toEqual('value');
    expect(bag.properties).toEqual({
      punchcard_key: 'value'
    });
  });
  it('push should add another namespace prefix', () => {
    const bag = new Core.Assembly();
    const subBag = bag.namespace('2');
    subBag.set('key', 'value');
    expect(bag.properties).toEqual({
      punchcard_2_key: 'value'
    });
    expect(subBag.get('key')).toEqual('value');
  });
  it('get should throw if key does not exist', () => {
    expect(() => new Core.Assembly().get('key')).toThrow();
  });
  it('tryGet should return undefined if key does not exist', () => {
    expect(new Core.Assembly().tryGet('key')).toEqual(undefined);
  });
});

describe('Cache', () => {
  it('insert should store a value in the cache', () => {
    const cache = new Core.Cache();
    cache.insert('key', 1);
    expect((cache as any).cache).toEqual({
      key: 1
    });
  });
  it('has should return true if key exists in cache', () => {
    const cache = new Core.Cache();
    cache.insert('key', 1);
    expect(cache.has('key')).toEqual(true);
  });
  it('has should return false if key does not exist in cache', () => {
    const cache = new Core.Cache();
    expect(cache.has('key')).toEqual(false);
  });
  it('get should return value if it exists in cache', () => {
    const cache = new Core.Cache();
    cache.insert('key', 1);
    expect(cache.get('key')).toEqual(1);
  });
  it('get should throw error if key is not in cache', () => {
    const cache = new Core.Cache();
    expect(() => cache.get('key')).toThrow();
  });
  it('tryGet should return value if it exists in cache', () => {
    const cache = new Core.Cache();
    cache.insert('key', 1);
    expect(cache.tryGet('key')).toEqual(1);
  });
  it('tryGet should return undefined if key is not in cache', () => {
    const cache = new Core.Cache();
    expect(cache.tryGet('key')).toEqual(undefined);
  });
  it('getOrCreate should create if the key is not in cache', () => {
    const cache = new Core.Cache();
    const fake = sinon.fake.returns('value');
    cache.getOrCreate('key', fake);
    expect(fake.calledOnce).toBe(true);
    expect(cache.get('key')).toEqual('value');
  });
});