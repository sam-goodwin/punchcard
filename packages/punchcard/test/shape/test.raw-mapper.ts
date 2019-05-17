import 'jest';
// tslint:disable-next-line: max-line-length
import { array, ArrayTypeConstraints, bigint, double, float, integer, map, MapTypeConstraints, NumberConstraints, optional, PrimitiveType, Raw, set, SetTypeConstraints, smallint, string, StringTypeConstraints, struct, tinyint, Type, Shape, RuntimeShape, binary, BinaryTypeConstraints } from '../../lib';

describe('string', () => {
  function shouldRead(desc: string, value: string, constraints?: StringTypeConstraints) {
    it(`should read if ${desc}`, () => {
      expect(Raw.forType(string(constraints)).read(value)).toEqual(value);
    });
  }

  function shouldThrow(desc: string, value: string, constraints?: StringTypeConstraints) {
    it(`should throw if ${desc}`, () => {
      expect(() => Raw.forType(string(constraints)).read(value)).toThrow();
    });
  }
  shouldRead('is a string', 'string');
  shouldRead('< maximum length', '1', {maxLength: 2});
  shouldRead('= maximum length', '12', {maxLength: 2});
  shouldRead('> minimum length', '12', {minLength: 1});
  shouldRead('= minimum length', '1', {minLength: 1});
  shouldRead('pattern matches', '1', {pattern: /[0-9]+/});

  shouldThrow('is not a string', 1 as any);
  shouldThrow('> maximum length', '1', {maxLength: 0});
  shouldThrow('< minimum length', '', {minLength: 1});
  shouldThrow('pattern does not match', 'a', {pattern: /[0-9]+/});
});

describe('binary', () => {
  function shouldRead(desc: string, value: string, constraints?: BinaryTypeConstraints) {
    const buf = Buffer.from(value);
    it(`should read if ${desc}`, () => {
      expect(Raw.forType(binary(constraints)).read(buf.toString('base64'))).toEqual(buf);
    });
  }

  function shouldThrow(desc: string, value: string, constraints?: BinaryTypeConstraints) {
    it(`should throw if ${desc}`, () => {
      expect(() => Raw.forType(binary(constraints)).read(Buffer.from(value).toString('base64'))).toThrow();
    });
  }
  shouldRead('is a string', 'string');
  shouldRead('< maximum length', '1', {maxLength: 2});
  shouldRead('= maximum length', '12', {maxLength: 2});
  shouldRead('> minimum length', '12', {minLength: 1});
  shouldRead('= minimum length', '1', {minLength: 1});

  it('should throw if not a string', () => {
    expect(() => Raw.forType(binary()).read(1 as any)).toThrow();
  });
  shouldThrow('> maximum length', '1', {maxLength: 0});
  shouldThrow('< minimum length', '', {minLength: 1});
});

function wholeNumberTests(f: (constraints?: NumberConstraints) => Type<number>) {
  function shouldRead(desc: string, value: number, constraints?: NumberConstraints) {
    it(`should read if ${desc}`, () => {
      expect(Raw.forType(f(constraints)).read(value)).toEqual(value);
    });
  }

  function shouldThrow(desc: string, value: number, constraints?: NumberConstraints) {
    it(`should throw if ${desc}`, () => {
      expect(() => Raw.forType(f(constraints)).read(value)).toThrow();
    });
  }

  describe('whole numbers', () => {
    shouldRead('-1', -1);
    shouldRead('0', 0);
    shouldRead('1', 1);
    shouldRead('< maximum', 9, {maximum: 10});
    shouldRead('= maximum', 10, {maximum: 10});
    shouldRead('> minimum', 11, {minimum: 10});
    shouldRead('= minimum', 10, {minimum: 10});
    shouldRead('multupleOf', 4, {multipleOf: 2});

    shouldThrow('not a number', 'string' as any);
    shouldThrow('> maximum', 11, {maximum: 10});
    shouldThrow('= exclusive maximum', 10, {maximum: 10, exclusiveMaximum: true});
    shouldThrow('< minimum', 9, {minimum: 10});
    shouldThrow('= exclusive minimum', 10, {minimum: 10, exclusiveMinimum: true});
    shouldThrow('not multupleOf', 5, {multipleOf: 2});
  });
}

function floatingPointNumberTests(f: (constraints?: NumberConstraints) => Type<number>) {
  function shouldRead(desc: string, value: number, constraints?: NumberConstraints) {
    it(`should read if ${desc}`, () => {
      expect(Raw.forType(f(constraints)).read(value)).toEqual(value);
    });
  }

  function shouldThrow(desc: string, value: number, constraints?: NumberConstraints) {
    it(`should throw if ${desc}`, () => {
      expect(() => Raw.forType(f(constraints)).read(value)).toThrow();
    });
  }

  describe('floating point', () => {
    shouldRead('-1.1', -1.1);
    shouldRead('0.0', 0.0);
    shouldRead('1.1', 1.1);
    shouldRead('< maximum', 10, {maximum: 10.1});
    shouldRead('= maximum', 10.1, {maximum: 10.1});
    shouldRead('> minimum', 10.2, {minimum: 10.1});
    shouldRead('= minimum', 10.1, {minimum: 10.1});
    shouldRead('multupleOf', 5, {multipleOf: 2.5});

    shouldThrow('not a number', 'string' as any);
    shouldThrow('> maximum', 10.1, {maximum: 10});
    shouldThrow('= exclusive maximum', 10.1, {maximum: 10.1, exclusiveMaximum: true});
    shouldThrow('< minimum', 10, {minimum: 10.1});
    shouldThrow('= exclusive minimum', 10.1, {minimum: 10.1, exclusiveMinimum: true});
    shouldThrow('not multupleOf', 4, {multipleOf: 2.5});
  });
}

describe('integer', () => {
  wholeNumberTests(integer);
});
describe('smallint', () => {
  wholeNumberTests(smallint);
});
describe('tinyint', () => {
  wholeNumberTests(tinyint);
});
describe('bigint', () => {
  wholeNumberTests(bigint);
});
describe('float', () => {
  wholeNumberTests(float);
  floatingPointNumberTests(float);
});
describe('double', () => {
  wholeNumberTests(double);
  floatingPointNumberTests(double);
});

describe('set', () => {
  function shouldRead(desc: string, a: string[], constraints?: SetTypeConstraints, stringConstraints?: StringTypeConstraints) {
    it(`should read ${desc}`, () => {
      const v: Set<string> = Raw.forType(set(string(stringConstraints), constraints)).read(a) as Set<string>;
      expect(Array.from(v.values())).toEqual(a);
    });
  }
  shouldRead('empty set', []);
  shouldRead('single item set', ['a']);
  shouldRead('multiple item set', ['a', 'b']);
  shouldRead('if length is less than maxItems', [], {maxItems: 1});
  shouldRead('if length is greater than minItems', ['a'], {minItems: 0});
  shouldRead('if items match constraints', ['a'], undefined, {maxLength: 2});

  function shouldThrow(desc: string, a: string[], constraints?: SetTypeConstraints, stringConstraints?: StringTypeConstraints) {
    it(`should throw ${desc}`, () => {
      expect(() => Raw.forType(set(string(stringConstraints), constraints)).read(a)).toThrow();
    });
  }
  shouldThrow('if not set', 'not an array' as any);
  shouldThrow('if length is less than minItems', [], {minItems: 1});
  shouldThrow('if length is greater than maxItems', ['a', 'b'], {maxItems: 1});
  shouldThrow('if items do not match constraints', ['12'], undefined, {maxLength: 1});
});

describe('array', () => {
  function shouldRead(desc: string, a: string[], constraints?: ArrayTypeConstraints, stringConstraints?: StringTypeConstraints) {
    it(`should read ${desc}`, () => {
      expect(Raw.forType(array(string(stringConstraints), constraints)).read(a)).toEqual(a);
    });
  }
  shouldRead('empty array', []);
  shouldRead('single item array', ['a']);
  shouldRead('multiple item array', ['a', 'b']);
  shouldRead('if length is less than maxItems', [], {maxItems: 1});
  shouldRead('if length is greater than minItems', ['a'], {minItems: 0});
  shouldRead('if all items are unique', ['a', 'b'], {uniqueItems: true});
  shouldRead('if items match constraints', ['a'], undefined, {maxLength: 2});

  it('should read if all (complex items) are unique', () => {
    expect(Raw.forType(array(struct({a: string()}), {uniqueItems: true})).read([{a: 'a'}, {a: 'b'}])).toEqual([
      {a: 'a'},
      {a: 'b'}
    ]);
  });

  function shouldThrow(desc: string, a: string[], constraints?: ArrayTypeConstraints, stringConstraints?: StringTypeConstraints) {
    it(`should throw ${desc}`, () => {
      expect(() => Raw.forType(array(string(stringConstraints), constraints)).read(a)).toThrow();
    });
  }
  shouldThrow('if not array', 'not an array' as any);
  shouldThrow('if length is less than minItems', [], {minItems: 1});
  shouldThrow('if length is greater than maxItems', ['a', 'b'], {maxItems: 1});
  shouldThrow('if not all items are unique', ['a', 'a'], {uniqueItems: true});
  shouldThrow('if items do not match constraints', ['12'], undefined, {maxLength: 1});

  it('should throw if not all (complex items) are unique', () => {
    expect(() => Raw.forType(array(struct({a: string()}), {uniqueItems: true})).read([{a: 'a'}, {a: 'a'}])).toThrow();
  });
});

describe('map', () => {
  function shouldRead(desc: string, a: {[key: string]: string}, constraints?: MapTypeConstraints, stringConstraints?: StringTypeConstraints) {
    it(`should read ${desc}`, () => {
      expect(Raw.forType(map(string(stringConstraints), constraints)).read(a)).toEqual(a);
    });
  }

  shouldRead('empty map', {});
  shouldRead('single item map', {a: 'a'});
  shouldRead('multiple item map', {a: 'a', b: 'b'});
  shouldRead('if less keys than maxProperties', {a: 'a'}, {maxProperties: 2});
  shouldRead('if no. of keys equal maxProperties', {a: 'a'}, {maxProperties: 1});
  shouldRead('if more keys than minProperties', {a: 'a'}, {minProperties: 0});
  shouldRead('if no. of keys equal minProperties', {a: 'a'}, {minProperties: 1});

  function shouldThrow(desc: string, a: {[key: string]: string}, constraints?: MapTypeConstraints, stringConstraints?: StringTypeConstraints) {
    it(`should throw ${desc}`, () => {
      expect(() => Raw.forType(map(string(stringConstraints), constraints)).read(a)).toThrow();
    });
  }

  shouldThrow('if not map', 'not a map' as any);
  shouldThrow('if value not correct type', {a: 1} as any);
  shouldThrow('if more keys than maxProperties', {a: 'a', b: 'b'}, {maxProperties: 1});
  shouldThrow('if less keys than minProperties', {}, {minProperties: 1});
  shouldThrow('if values do not match constraint', {a: '1'}, undefined, {maxLength: 0});
});

describe('optional', () => {
  it('should read undefined', () => {
    expect(Raw.forType(optional(string()) as Type<string>).read(undefined)).toEqual(undefined);
  });
  it('should read string', () => {
    expect(Raw.forType(optional(string()) as Type<string>).read('string')).toEqual('string');
  });
  it('should throw if item constraints do not match', () => {
    expect(() => Raw.forType(optional(string({maxLength: 1})) as Type<string>).read('string')).toThrow();
  });
});

describe('struct', () => {
  function shouldRead<S extends Shape>(desc: string, shape: S, a: RuntimeShape<S>) {
    it(`should read if ${desc}`, () => {
      expect(Raw.forShape(shape).read(a)).toEqual(a);
    });
  }
  shouldRead('struct', {a: string()}, {a: 'a'});
  shouldRead('nested struct', {a: struct({a: string()})}, {a: {a: 'a'}});
  shouldRead('item constraints match', {a: string({maxLength: 2})}, {a: '1'});

  function shouldThrow<S extends Shape>(desc: string, shape: S, a: RuntimeShape<S>) {
    it(`should throw if ${desc}`, () => {
      expect(() => Raw.forShape(shape).read(a)).toThrow();
    });
  }

  shouldThrow('not object', {a: string()}, 'not a struct' as any);
  shouldThrow('item type does not match', {a: string()}, {a: 1} as any);
  shouldThrow('item value invalid', {a: string({maxLength: 1})}, {a: '12'});
});
