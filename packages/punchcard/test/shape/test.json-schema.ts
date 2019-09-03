import 'jest';

import {  Shape, Util } from '../../lib';

const tree = Shape.struct({
  stringField: Shape.string(),
  intField: Shape.integer(),
  numberField: Shape.float(),
  boolField: Shape.boolean,

  stringArray: Shape.array(Shape.string()),
  structArray: Shape.array(Shape.struct({
    item: Shape.string()
  })),

  stringMap: Shape.map(Shape.string()),
  structMap: Shape.map(Shape.struct({
    item: Shape.string()
  })),

  optionalArray: Shape.optional(Shape.array(Shape.string())),

  struct: Shape.struct({
    stringField: Shape.string(),
    intField: Shape.integer(),
    numberField: Shape.float(),
    boolField: Shape.boolean,

    stringArray: Shape.array(Shape.string()),
    intArray: Shape.array(Shape.integer()),
    numberArray: Shape.array(Shape.float()),
    boolArray: Shape.array(Shape.boolean),

    stringMap: Shape.map(Shape.string()),
    intMap: Shape.map(Shape.integer()),
    numberMap: Shape.map(Shape.float()),
    boolMap: Shape.map(Shape.boolean),
  })
});

describe('json', () => {
  describe('schema', () => {
    describe('string', () => {
      it('plain', () => {
        expect(Shape.string().toJsonSchema()).toEqual({
          type: 'string'
        });
      });
      it('maxLength', () => {
        expect(Shape.string({maxLength: 10}).toJsonSchema()).toEqual({
          type: 'string',
          maxLength: 10
        });
      });
      it('minLength', () => {
        expect(Shape.string({minLength: 10}).toJsonSchema()).toEqual({
          type: 'string',
          minLength: 10
        });
      });
      it('pattern', () => {
      expect(Shape.string({pattern: /.*/}).toJsonSchema()).toEqual({
          type: 'string',
          pattern: '.*'
        });
      });
    });

    describe('integer', () => {
      it('plain', () => {
        expect(Shape.integer().toJsonSchema()).toEqual({
          type: 'integer'
        });
      });
      it('minimum', () => {
        expect(Shape.integer({minimum: 0}).toJsonSchema()).toEqual({
          type: 'integer',
          minimum: 0
        });
      });
      it('maximum', () => {
        expect(Shape.integer({maximum: 10}).toJsonSchema()).toEqual({
          type: 'integer',
          maximum: 10
        });
      });
      it('exclusiveMinimum', () => {
        expect(Shape.integer({minimum: 0, exclusiveMinimum: true}).toJsonSchema()).toEqual({
          type: 'integer',
          minimum: 0,
          exclusiveMinimum: true
        });
      });
      it('exclusiveMaximum', () => {
        expect(Shape.integer({maximum: 10, exclusiveMaximum: true}).toJsonSchema()).toEqual({
          type: 'integer',
          maximum: 10,
          exclusiveMaximum: true
        });
      });
    });

    describe('number', () => {
      it('plain', () => {
        expect(Shape.float().toJsonSchema()).toEqual({
          type: 'number'
        });
      });
      it('minimum', () => {
        expect(Shape.float({minimum: 0}).toJsonSchema()).toEqual({
          type: 'number',
          minimum: 0
        });
      });
      it('maximum', () => {
        expect(Shape.float({maximum: 10}).toJsonSchema()).toEqual({
          type: 'number',
          maximum: 10
        });
      });
      it('exclusiveMinimum', () => {
        expect(Shape.float({minimum: 0, exclusiveMinimum: true}).toJsonSchema()).toEqual({
          type: 'number',
          minimum: 0,
          exclusiveMinimum: true
        });
      });
      it('exclusiveMaximum', () => {
        expect(Shape.float({maximum: 10, exclusiveMaximum: true}).toJsonSchema()).toEqual({
          type: 'number',
          maximum: 10,
          exclusiveMaximum: true
        });
      });
    });

    // https://json-schema.org/understanding-json-schema/reference/string.html#built-in-formats
    describe('string formats', () => {
      it('timestamp', () => {
        expect(Shape.timestamp.toJsonSchema()).toEqual({
          type: 'string',
          format: 'date-time'
        });
      });
    });

    it('Shape.boolean', () => {
      expect(Shape.boolean.toJsonSchema()).toEqual({
        type: 'boolean'
      });
    });

    it('optional', () => {
      expect(Shape.optional(Shape.string()).toJsonSchema()).toEqual({
        type: ['null', 'string']
      });
    });

    it('struct', () => {
      const schema = Shape.struct({
        key: Shape.string(),
        optional: Shape.optional(Shape.string())
      }).toJsonSchema();

      expect(schema).toEqual({
        type: 'object',
        properties: {
          key: {
            type: 'string',
          },
          optional: {
            type: ['null', 'string']
          }
        },
        additionalProperties: false,
        required: ['key']
      });
    });

    describe('map', () => {
      it('plain', () => {
        const schema = Shape.map(Shape.string()).toJsonSchema();

        expect(schema).toEqual({
          type: 'object',
          additionalProperties: {
            type: 'string'
          }
        });
      });
      it('minProperties', () => {
        const schema = Shape.map(Shape.string(), {minProperties: 1}).toJsonSchema();

        expect(schema).toEqual({
          type: 'object',
          additionalProperties: {
            type: 'string'
          },
          minProperties: 1
        });
      });
      it('maxProperties', () => {
        const schema = Shape.map(Shape.string(), {maxProperties: 1}).toJsonSchema();

        expect(schema).toEqual({
          type: 'object',
          additionalProperties: {
            type: 'string'
          },
          maxProperties: 1
        });
      });
    });

    describe('array', () => {
      it('plain', () => {
        const schema = Shape.array(Shape.string()).toJsonSchema();
        expect(schema).toEqual({
          type: 'array',
          items: {
            type: 'string'
          }
        });
      });
      it('minItems', () => {
        const schema = Shape.array(Shape.string(), {minItems: 1}).toJsonSchema();
        expect(schema).toEqual({
          type: 'array',
          items: {
            type: 'string'
          },
          minItems: 1
        });
      });
      it('maxItems', () => {
        const schema = Shape.array(Shape.string(), {maxItems: 1}).toJsonSchema();
        expect(schema).toEqual({
          type: 'array',
          items: {
            type: 'string'
          },
          maxItems: 1
        });
      });
      it('uniqueItems', () => {
        const schema = Shape.array(Shape.string(), {uniqueItems: true}).toJsonSchema();
        expect(schema).toEqual({
          type: 'array',
          items: {
            type: 'string'
          },
          uniqueItems: true
        });
      });
    });
  });

  describe('validate', () => {
    describe('string', () => {
      it('none', () => {
        Shape.string().validate('test');
      });
      it('minLength', () => {
        expect(() => Shape.string({minLength: 1}).validate('')).toThrow();
        Shape.string({minLength: 1}).validate('1');
      });
      it('maxLength', () => {
        expect(() => Shape.string({maxLength: 1}).validate('12')).toThrow();
        Shape.string({maxLength: 1}).validate('1');
      });
      it('pattern', () => {
        expect(() => Shape.string({pattern: /abc/}).validate('cba')).toThrow();
        Shape.string({pattern: /abc/}).validate('abc');
      });
    });
    describe('integer', () => {
      it('none', () => {
        Shape.integer().validate(1);
        expect(() => Shape.integer().validate(1.1)).toThrow(); // whole numbers only
      });
      it('minimum', () => {
        expect(() => Shape.integer({minimum: 1}).validate(0)).toThrow();
        Shape.integer({minimum: 1}).validate(1);
      });
      it('exclusiveMinimum', () => {
        expect(() => Shape.integer({minimum: 1, exclusiveMinimum: true}).validate(0)).toThrow();
        expect(() => Shape.integer({minimum: 1, exclusiveMinimum: true}).validate(1)).toThrow();
        Shape.integer({minimum: 1, exclusiveMinimum: true}).validate(2);
      });
      it('maximum', () => {
        expect(() => Shape.integer({maximum: 1}).validate(2)).toThrow();
        Shape.integer({maximum: 1}).validate(1);
      });
      it('exclusiveMaximum', () => {
        expect(() => Shape.integer({maximum: 1, exclusiveMaximum: true}).validate(2)).toThrow();
        expect(() => Shape.integer({maximum: 1, exclusiveMaximum: true}).validate(1)).toThrow();
        Shape.integer({maximum: 1, exclusiveMaximum: true}).validate(0);
      });
      it('multipleOf', () => {
        expect(() => Shape.integer({multipleOf: 2}).validate(3)).toThrow();
        Shape.integer({multipleOf: 2}).validate(4);
      });
    });
    describe('number', () => {
      it('none', () => {
        Shape.float().validate(1.1);
      });
      it('minimum', () => {
        expect(() => Shape.float({minimum: 1}).validate(0)).toThrow();
        Shape.float({minimum: 1}).validate(1);
      });
      it('exclusiveMinimum', () => {
        expect(() => Shape.float({minimum: 1, exclusiveMinimum: true}).validate(0)).toThrow();
        expect(() => Shape.float({minimum: 1, exclusiveMinimum: true}).validate(1)).toThrow();
        Shape.float({minimum: 1, exclusiveMinimum: true}).validate(2);
      });
      it('maximum', () => {
        expect(() => Shape.float({maximum: 1}).validate(2)).toThrow();
        Shape.float({maximum: 1}).validate(1);
      });
      it('exclusiveMaximum', () => {
        expect(() => Shape.float({maximum: 1, exclusiveMaximum: true}).validate(2)).toThrow();
        expect(() => Shape.float({maximum: 1, exclusiveMaximum: true}).validate(1)).toThrow();
        Shape.float({maximum: 1, exclusiveMaximum: true}).validate(0);
      });
      it('multipleOf', () => {
        expect(() => Shape.float({multipleOf: 2}).validate(3)).toThrow();
        Shape.float({multipleOf: 2}).validate(4);
      });
    });
    describe('array', () => {
      it('none', () => {
        Shape.array(Shape.string()).validate([]);
        Shape.array(Shape.string()).validate(['1']);
      });
      it('minItems', () => {
        expect(() => Shape.array(Shape.string(), {minItems: 1}).validate([])).toThrow();
        Shape.array(Shape.string(), {minItems: 1}).validate(['1']);
      });
      it('maxItems', () => {
        expect(() => Shape.array(Shape.string(), {maxItems: 1}).validate(['1', '2'])).toThrow();
        Shape.array(Shape.string(), {maxItems: 1}).validate(['1']);
        Shape.array(Shape.string(), {maxItems: 1}).validate([]);
      });
      it('uniqueItems', () => {
        expect(() => Shape.array(Shape.string(), {uniqueItems: true}).validate(['1', '1'])).toThrow();
        Shape.array(Shape.string(), {uniqueItems: true}).validate(['1', '2']);

        // test struct deep equals and hashCode
        expect(() => Shape.array(Shape.struct({key: Shape.string()}), {uniqueItems: true}).validate([{key: '1'}, {key: '1'}])).toThrow();
        Shape.array(Shape.struct({key: Shape.string()}), {uniqueItems: true}).validate([{key: '1'}]);
      });
    });
    describe('map', () => {
      it('none', () => {
        Shape.map(Shape.string()).validate({key: '1'});
      });
      it('minProperties', () => {
        expect(() => Shape.map(Shape.string(), {minProperties: 1}).validate({})).toThrow();
        Shape.map(Shape.string(), {minProperties: 1}).validate({key: 'value'});
      });
      it('maxProperties', () => {
        expect(() => Shape.map(Shape.string(), {maxProperties: 1}).validate({key: 'value', key2: 'value2'})).toThrow();
        Shape.map(Shape.string(), {maxProperties: 1}).validate({key: 'value'});
        Shape.map(Shape.string(), {maxProperties: 1}).validate({});
      });
    });
  });
});
