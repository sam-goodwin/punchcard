import 'jest';
import { PropertyBag, RuntimePropertyBag } from '../lib';

describe('PropertyBag', () => {
  it('should append prefix keys when setting a value', () => {
    const bag = new PropertyBag('test', {});
    bag.set('key', 'value');
    expect(bag.get('key')).toEqual('value');
    expect(bag.properties).toEqual({
      test_key: 'value'
    });
  });
  it('push should add another namespace prefix', () => {
    const bag = new PropertyBag('test', {});
    const subBag = bag.push('2');
    subBag.set('key', 'value');
    expect(bag.properties).toEqual({
      test_2_key: 'value'
    });
    expect(subBag.get('key')).toEqual('value');
  });
  it('get should throw if key does not exist', () => {
    expect(() => new PropertyBag('test', {}).get('key')).toThrow();
  });
  it('tryGet should return undefined if key does not exist', () => {
    expect(new PropertyBag('test', {}).tryGet('key')).toEqual(undefined);
  });
});

describe('RuntimePropertyBag', () => {
  it('insertCache should store a value in the cache', () => {
    const cache = {};
    const bag = new RuntimePropertyBag('test', {}, cache);
    bag.insertCache('key', 1);
    expect(cache).toEqual({
      key: 1
    });
  });
  it('hasCache should return true if key exists in cache', () => {
    const bag = new RuntimePropertyBag('test', {}, {});
    bag.insertCache('key', 1);
    expect(bag.hasCache('key')).toEqual(true);
  });
  it('hasCache should return false if key does not exist in cache', () => {
    const bag = new RuntimePropertyBag('test', {}, {});
    expect(bag.hasCache('key')).toEqual(false);
  });
  it('lookupCache should return value if it exists in cache', () => {
    const bag = new RuntimePropertyBag('test', {}, {});
    bag.insertCache('key', 1);
    expect(bag.lookupCache('key')).toEqual(1);
  });
  it('lookupCache should throw error if key is not in cache', () => {
    const bag = new RuntimePropertyBag('test', {}, {});
    expect(() => bag.lookupCache('key')).toThrow();
  });
  it('tryLookupCache should return value if it exists in cache', () => {
    const bag = new RuntimePropertyBag('test', {}, {});
    bag.insertCache('key', 1);
    expect(bag.tryLookupCache('key')).toEqual(1);
  });
  it('tryLokupCache should return undefined if key is not in cache', () => {
    const bag = new RuntimePropertyBag('test', {}, {});
    expect(bag.tryLookupCache('key')).toEqual(undefined);
  });
});