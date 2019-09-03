import 'jest';
// tslint:disable-next-line: max-line-length

import { Shape } from '../../lib';
import { struct } from '../../lib/shape';

it('any should pass through', () => {
  const mapper = Shape.Raw.forShape(Shape.dynamic);
  expect(mapper.read({
    a: {
      nested: 'value'
    }
  })).toEqual({
    a: {
      nested: 'value'
    }
  });
});

describe('boolean', () => {
  const mapper = Shape.Raw.forShape(Shape.boolean);
  it('should read true', () => expect(mapper.read(true)).toEqual(true));
  it('should read false', () => expect(mapper.read(false)).toEqual(false));
  it('should throw if not boolean', () => expect(() => mapper.read('not a boolean' as any)).toThrow());

  it('should write true', () => expect(mapper.write(true)).toEqual(true));
  it('should write false', () => expect(mapper.write(false)).toEqual(false));
});

describe('timestamp', () => {
  it('should read ISO8601 string', () => {
    expect(Shape.Raw.forShape(Shape.timestamp).read(new Date(0).toISOString())).toEqual(new Date(0));
  });
  it('should read non ISO8601 format', () => {
    expect(Shape.Raw.forShape(Shape.timestamp).read('2019-01-01 00:00:00Z')).toEqual(new Date(Date.parse('2019-01-01T00:00:00.000Z')));
  });
  it('should assume UTC format', () => {
    expect(Shape.Raw.forShape(Shape.timestamp).read('2019-01-01 00:00:00')).toEqual(new Date(Date.parse('2019-01-01T00:00:00.000Z')));
  });
  it('should write ISO8601 string', () => {
    expect(Shape.Raw.forShape(Shape.timestamp).write(new Date(0))).toEqual(new Date(0).toISOString());
  });
  it('should write AWSGlue format', () => {
    expect(Shape.Raw.forShape(Shape.timestamp, {
      writer: new Shape.Raw.Writer({
        timestampFormat: Shape.TimestampFormat.AwsGlue
      })
    }).write(new Date(0))).toEqual('1970-01-01 00:00:00.000');
  });
});

describe('string', () => {
  it('should write string', () => expect(Shape.Raw.forShape(Shape.string()).write('string')).toEqual('string'));

  function shouldRead(desc: string, value: string, constraints?: Shape.StringTypeConstraints) {
    it(`should read if ${desc}`, () => {
      expect(Shape.Raw.forShape(Shape.string(constraints)).read(value)).toEqual(value);
    });
  }

  function shouldThrow(desc: string, value: string, constraints?: Shape.StringTypeConstraints) {
    it(`should throw if ${desc}`, () => {
      expect(() => Shape.Raw.forShape(Shape.string(constraints)).read(value)).toThrow();
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
  it('should write binary as base64 encoded string', () =>
    expect(Shape.Raw.forShape(Shape.binary()).write(Buffer.from('string'))).toEqual(Buffer.from('string').toString('base64')));

  function shouldRead(desc: string, value: string, constraints?: Shape.BinaryShapeConstraints) {
    const buf = Buffer.from(value);
    it(`should read if ${desc}`, () => {
      expect(Shape.Raw.forShape(Shape.binary(constraints)).read(buf.toString('base64'))).toEqual(buf);
    });
  }

  function shouldThrow(desc: string, value: string, constraints?: Shape.BinaryShapeConstraints) {
    it(`should throw if ${desc}`, () => {
      expect(() => Shape.Raw.forShape(Shape.binary(constraints)).read(Buffer.from(value).toString('base64'))).toThrow();
    });
  }
  shouldRead('is a string', 'string');
  shouldRead('< maximum length', '1', {maxLength: 2});
  shouldRead('= maximum length', '12', {maxLength: 2});
  shouldRead('> minimum length', '12', {minLength: 1});
  shouldRead('= minimum length', '1', {minLength: 1});

  it('should throw if not a string', () => {
    expect(() => Shape.Raw.forShape(Shape.binary()).read(1 as any)).toThrow();
  });
  shouldThrow('> maximum length', '1', {maxLength: 0});
  shouldThrow('< minimum length', '', {minLength: 1});
});

function wholeNumberTests(f: (constraints?: Shape.NumberConstraints) => Shape.Shape<number>) {
  it('should write a whole number', () => {
    expect(Shape.Raw.forShape(f()).write(1)).toEqual(1);
  });

  function shouldRead(desc: string, value: number, constraints?: Shape.NumberConstraints) {
    it(`should read if ${desc}`, () => {
      expect(Shape.Raw.forShape(f(constraints)).read(value)).toEqual(value);
    });
  }

  function shouldThrow(desc: string, value: number, constraints?: Shape.NumberConstraints) {
    it(`should throw if ${desc}`, () => {
      expect(() => Shape.Raw.forShape(f(constraints)).read(value)).toThrow();
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

function floatingPointNumberTests(f: (constraints?: Shape.NumberConstraints) => Shape.Shape<number>) {
  it('should write a floating point number', () => {
    expect(Shape.Raw.forShape(f()).write(1.1)).toEqual(1.1);
  });

  function shouldRead(desc: string, value: number, constraints?: Shape.NumberConstraints) {
    it(`should read if ${desc}`, () => {
      expect(Shape.Raw.forShape(f(constraints)).read(value)).toEqual(value);
    });
  }

  function shouldThrow(desc: string, value: number, constraints?: Shape.NumberConstraints) {
    it(`should throw if ${desc}`, () => {
      expect(() => Shape.Raw.forShape(f(constraints)).read(value)).toThrow();
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
  wholeNumberTests(Shape.integer);
});
describe('smallint', () => {
  wholeNumberTests(Shape.smallint);
});
describe('tinyint', () => {
  wholeNumberTests(Shape.tinyint);
});
describe('bigint', () => {
  wholeNumberTests(Shape.bigint);
});
describe('float', () => {
  wholeNumberTests(Shape.float);
  floatingPointNumberTests(Shape.float);
});
describe('double', () => {
  wholeNumberTests(Shape.double);
  floatingPointNumberTests(Shape.double);
});

describe('set', () => {
  it('should write Set as array', () => {
    expect(Shape.Raw.forShape(Shape.set(Shape.string())).write(new Set('a'))).toEqual(['a']);
  });

  function shouldRead(desc: string, a: string[], constraints?: Shape.SetShapeConstraints, stringConstraints?: Shape.StringTypeConstraints) {
    it(`should read ${desc}`, () => {
      const v: Set<string> = Shape.Raw.forShape(Shape.set(Shape.string(stringConstraints), constraints)).read(a) as Set<string>;
      expect(Array.from(v.values())).toEqual(a);
    });
  }
  shouldRead('empty set', []);
  shouldRead('single item set', ['a']);
  shouldRead('multiple item set', ['a', 'b']);
  shouldRead('if length is less than maxItems', [], {maxItems: 1});
  shouldRead('if length is greater than minItems', ['a'], {minItems: 0});
  shouldRead('if items match constraints', ['a'], undefined, {maxLength: 2});

  function shouldThrow(desc: string, a: string[], constraints?: Shape.SetShapeConstraints, stringConstraints?: Shape.StringTypeConstraints) {
    it(`should throw ${desc}`, () => {
      expect(() => Shape.Raw.forShape(Shape.set(Shape.string(stringConstraints), constraints)).read(a)).toThrow();
    });
  }
  shouldThrow('if not set', 'not an array' as any);
  shouldThrow('if length is less than minItems', [], {minItems: 1});
  shouldThrow('if length is greater than maxItems', ['a', 'b'], {maxItems: 1});
  shouldThrow('if items do not match constraints', ['12'], undefined, {maxLength: 1});
});

describe('array', () => {
  it('should write array', () => {
    expect(Shape.Raw.forShape(Shape.array(Shape.string())).write(['a'])).toEqual(['a']);
  });

  function shouldRead(desc: string, a: string[], constraints?: Shape.ArrayShapeConstraints, stringConstraints?: Shape.StringTypeConstraints) {
    it(`should read ${desc}`, () => {
      expect(Shape.Raw.forShape(Shape.array(Shape.string(stringConstraints), constraints)).read(a)).toEqual(a);
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
    expect(Shape.Raw.forShape(Shape.array(Shape.struct({a: Shape.string()}), {uniqueItems: true})).read([{a: 'a'}, {a: 'b'}])).toEqual([
      {a: 'a'},
      {a: 'b'}
    ]);
  });

  function shouldThrow(desc: string, a: string[], constraints?: Shape.ArrayShapeConstraints, stringConstraints?: Shape.StringTypeConstraints) {
    it(`should throw ${desc}`, () => {
      expect(() => Shape.Raw.forShape(Shape.array(Shape.string(stringConstraints), constraints)).read(a)).toThrow();
    });
  }
  shouldThrow('if not array', 'not an array' as any);
  shouldThrow('if length is less than minItems', [], {minItems: 1});
  shouldThrow('if length is greater than maxItems', ['a', 'b'], {maxItems: 1});
  shouldThrow('if not all items are unique', ['a', 'a'], {uniqueItems: true});
  shouldThrow('if items do not match constraints', ['12'], undefined, {maxLength: 1});

  it('should throw if not all (complex items) are unique', () => {
    expect(() => Shape.Raw.forShape(Shape.array(Shape.struct({a: Shape.string()}), {uniqueItems: true})).read([{a: 'a'}, {a: 'a'}])).toThrow();
  });
});

describe('map', () => {
  it('should write map', () => {
    expect(Shape.Raw.forShape(Shape.map(Shape.string())).write({a: 'a'})).toEqual({a: 'a'});
  });

  function shouldRead(desc: string, a: {[key: string]: string}, constraints?: Shape.MapShapeConstraints, stringConstraints?: Shape.StringTypeConstraints) {
    it(`should read ${desc}`, () => {
      expect(Shape.Raw.forShape(Shape.map(Shape.string(stringConstraints), constraints)).read(a)).toEqual(a);
    });
  }

  shouldRead('empty map', {});
  shouldRead('single item map', {a: 'a'});
  shouldRead('multiple item map', {a: 'a', b: 'b'});
  shouldRead('if less keys than maxProperties', {a: 'a'}, {maxProperties: 2});
  shouldRead('if no. of keys equal maxProperties', {a: 'a'}, {maxProperties: 1});
  shouldRead('if more keys than minProperties', {a: 'a'}, {minProperties: 0});
  shouldRead('if no. of keys equal minProperties', {a: 'a'}, {minProperties: 1});

  function shouldThrow(desc: string, a: {[key: string]: string}, constraints?: Shape.MapShapeConstraints, stringConstraints?: Shape.StringTypeConstraints) {
    it(`should throw ${desc}`, () => {
      expect(() => Shape.Raw.forShape(Shape.map(Shape.string(stringConstraints), constraints)).read(a)).toThrow();
    });
  }

  shouldThrow('if not map', 'not a map' as any);
  shouldThrow('if value not correct type', {a: 1} as any);
  shouldThrow('if more keys than maxProperties', {a: 'a', b: 'b'}, {maxProperties: 1});
  shouldThrow('if less keys than minProperties', {}, {minProperties: 1});
  shouldThrow('if values do not match constraint', {a: '1'}, undefined, {maxLength: 0});
});

describe('optional', () => {
  it('should write undefined as null', () => {
    expect(Shape.Raw.forShape(Shape.optional(Shape.string()) as Shape.Shape<string>).write(undefined as any)).toEqual(null);
  });
  it('should write null as null', () => {
    expect(Shape.Raw.forShape(Shape.optional(Shape.string()) as Shape.Shape<string>).write(null as any)).toEqual(null);
  });
  it('should not write nulls if configured', () => {
    expect(Shape.Raw.forShape(Shape.optional(Shape.string()) as Shape.Shape<string>, {
      writer: new Shape.Raw.Writer({
        writeNulls: false
      })
    }).write(null as any)).toEqual(undefined);
  });
  it('should write value', () => {
    expect(Shape.Raw.forShape(Shape.optional(Shape.string()) as Shape.Shape<string>).write('string')).toEqual('string');
  });

  it('should read undefined', () => {
    expect(Shape.Raw.forShape(Shape.optional(Shape.string()) as Shape.Shape<string>).read(undefined)).toEqual(undefined);
  });
  it('should read string', () => {
    expect(Shape.Raw.forShape(Shape.optional(Shape.string()) as Shape.Shape<string>).read('string')).toEqual('string');
  });
  it('should throw if item constraints do not match', () => {
    expect(() => Shape.Raw.forShape(Shape.optional(Shape.string({maxLength: 1})) as Shape.Shape<string>).read('string')).toThrow();
  });
});

describe('struct', () => {
  it('should write struct', () => {
    expect(Shape.Raw.forShape(Shape.struct({a: Shape.string()})).write({a: 'string'})).toEqual({a: 'string'});
  });

  function shouldRead<S extends Shape.StructShape<any>>(desc: string, shape: S, a: Shape.RuntimeShape<S>) {
    it(`should read if ${desc}`, () => {
      expect(Shape.Raw.forShape(shape).read(a)).toEqual(a);
    });
  }
  shouldRead('struct', struct({a: Shape.string()}), {a: 'a'});
  shouldRead('nested struct', struct({a: Shape.struct({a: Shape.string()})}), {a: {a: 'a'}});
  shouldRead('item constraints match', struct({a: Shape.string({maxLength: 2})}), {a: '1'});

  function shouldThrow<S extends Shape.StructShape<any>>(desc: string, shape: S, a: Shape.RuntimeShape<S>) {
    it(`should throw if ${desc}`, () => {
      expect(() => Shape.Raw.forShape(shape).read(a)).toThrow();
    });
  }

  shouldThrow('not object', struct({a: Shape.string()}), 'not a struct' as any);
  shouldThrow('item type does not match', struct({a: Shape.string()}), {a: 1} as any);
  shouldThrow('item value invalid', struct({a: Shape.string({maxLength: 1})}), {a: '12'});
});
