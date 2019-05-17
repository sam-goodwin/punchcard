import 'jest';

import { BaseDynamoPath, DynamoPath } from '../../lib/dynamodb';
import {
  array,
  boolean,
  CustomPath,
  CustomType,
  float,
  integer,
  JsonPath,
  jsonPath,
  map,

  optional,
  string,
  struct,
  timestamp
} from '../../lib/shape';
import { TreeFields } from '../../lib/tree';

export function custom(): Custom {
  return new Custom();
}
export class Custom extends CustomType<Custom.Shape> {
  constructor() {
    super(Custom.shape);
  }

  public toDynamoPath(parent: DynamoPath, name: string): any {
    return new BaseDynamoPath(parent, name, this);
  }

  public toJsonPath(parent: JsonPath<any>, name: string): Custom.Path {
    return new Custom.Path(parent, name, this);
  }
}
export namespace Custom {
  export type Shape = typeof shape;
  export const shape = {
    id: string(),
    arr: array(string())
  };
  export class Path extends CustomPath<Shape, Custom> {
    public customOperation() {
      return this.fields.arr.slice(0, 1);
    }
  }
  // export class DynamoPath extends CustomPath<Shape, Custom> {
  //   public customOperation() {
  //     return this.fields.arr.slice(0, 1);
  //   }
  // }
}

const tree = {
  stringField: string(),
  intField: integer(),
  numberField: float(),
  boolField: boolean,

  stringArray: array(string()),
  structArray: array(struct({
    item: string()
  })),

  stringMap: map(string()),
  structMap: map(struct({
    item: string()
  })),

  optionalArray: optional(array(string())),

  custom: custom(),

  struct: struct({
    stringField: string(),
    intField: integer(),
    numberField: float(),
    boolField: boolean,

    stringArray: array(string()),
    intArray: array(integer()),
    numberArray: array(float()),
    boolArray: array(boolean),

    stringMap: map(string()),
    intMap: map(integer()),
    numberMap: map(float()),
    boolMap: map(boolean),
  })
};

describe('json', () => {
  describe('schema', () => {
    describe('string', () => {
      it('plain', () => {
        expect(string().toJsonSchema()).toEqual({
          type: 'string'
        });
      });
      it('maxLength', () => {
        expect(string({maxLength: 10}).toJsonSchema()).toEqual({
          type: 'string',
          maxLength: 10
        });
      });
      it('minLength', () => {
        expect(string({minLength: 10}).toJsonSchema()).toEqual({
          type: 'string',
          minLength: 10
        });
      });
      it('pattern', () => {
      expect(string({pattern: /.*/}).toJsonSchema()).toEqual({
          type: 'string',
          pattern: '.*'
        });
      });
    });

    describe('integer', () => {
      it('plain', () => {
        expect(integer().toJsonSchema()).toEqual({
          type: 'integer'
        });
      });
      it('minimum', () => {
        expect(integer({minimum: 0}).toJsonSchema()).toEqual({
          type: 'integer',
          minimum: 0
        });
      });
      it('maximum', () => {
        expect(integer({maximum: 10}).toJsonSchema()).toEqual({
          type: 'integer',
          maximum: 10
        });
      });
      it('exclusiveMinimum', () => {
        expect(integer({minimum: 0, exclusiveMinimum: true}).toJsonSchema()).toEqual({
          type: 'integer',
          minimum: 0,
          exclusiveMinimum: true
        });
      });
      it('exclusiveMaximum', () => {
        expect(integer({maximum: 10, exclusiveMaximum: true}).toJsonSchema()).toEqual({
          type: 'integer',
          maximum: 10,
          exclusiveMaximum: true
        });
      });
    });

    describe('number', () => {
      it('plain', () => {
        expect(float().toJsonSchema()).toEqual({
          type: 'number'
        });
      });
      it('minimum', () => {
        expect(float({minimum: 0}).toJsonSchema()).toEqual({
          type: 'number',
          minimum: 0
        });
      });
      it('maximum', () => {
        expect(float({maximum: 10}).toJsonSchema()).toEqual({
          type: 'number',
          maximum: 10
        });
      });
      it('exclusiveMinimum', () => {
        expect(float({minimum: 0, exclusiveMinimum: true}).toJsonSchema()).toEqual({
          type: 'number',
          minimum: 0,
          exclusiveMinimum: true
        });
      });
      it('exclusiveMaximum', () => {
        expect(float({maximum: 10, exclusiveMaximum: true}).toJsonSchema()).toEqual({
          type: 'number',
          maximum: 10,
          exclusiveMaximum: true
        });
      });
    });

    // https://json-schema.org/understanding-json-schema/reference/string.html#built-in-formats
    describe('string formats', () => {
      it('timestamp', () => {
        expect(timestamp.toJsonSchema()).toEqual({
          type: 'string',
          format: 'date-time'
        });
      });
    });

    it('boolean', () => {
      expect(boolean.toJsonSchema()).toEqual({
        type: 'boolean'
      });
    });

    it('optional', () => {
      expect(optional(string()).toJsonSchema()).toEqual({
        type: ['null', 'string']
      });
    });

    it('struct', () => {
      const schema = struct({
        key: string(),
        optional: optional(string())
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
        const schema = map(string()).toJsonSchema();

        expect(schema).toEqual({
          type: 'object',
          additionalProperties: {
            type: 'string'
          }
        });
      });
      it('minProperties', () => {
        const schema = map(string(), {minProperties: 1}).toJsonSchema();

        expect(schema).toEqual({
          type: 'object',
          additionalProperties: {
            type: 'string'
          },
          minProperties: 1
        });
      });
      it('maxProperties', () => {
        const schema = map(string(), {maxProperties: 1}).toJsonSchema();

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
        const schema = array(string()).toJsonSchema();
        expect(schema).toEqual({
          type: 'array',
          items: {
            type: 'string'
          }
        });
      });
      it('minItems', () => {
        const schema = array(string(), {minItems: 1}).toJsonSchema();
        expect(schema).toEqual({
          type: 'array',
          items: {
            type: 'string'
          },
          minItems: 1
        });
      });
      it('maxItems', () => {
        const schema = array(string(), {maxItems: 1}).toJsonSchema();
        expect(schema).toEqual({
          type: 'array',
          items: {
            type: 'string'
          },
          maxItems: 1
        });
      });
      it('uniqueItems', () => {
        const schema = array(string(), {uniqueItems: true}).toJsonSchema();
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
        string().validate('test');
      });
      it('minLength', () => {
        expect(() => string({minLength: 1}).validate('')).toThrow();
        string({minLength: 1}).validate('1');
      });
      it('maxLength', () => {
        expect(() => string({maxLength: 1}).validate('12')).toThrow();
        string({maxLength: 1}).validate('1');
      });
      it('pattern', () => {
        expect(() => string({pattern: /abc/}).validate('cba')).toThrow();
        string({pattern: /abc/}).validate('abc');
      });
    });
    describe('integer', () => {
      it('none', () => {
        integer().validate(1);
        expect(() => integer().validate(1.1)).toThrow(); // whole numbers only
      });
      it('minimum', () => {
        expect(() => integer({minimum: 1}).validate(0)).toThrow();
        integer({minimum: 1}).validate(1);
      });
      it('exclusiveMinimum', () => {
        expect(() => integer({minimum: 1, exclusiveMinimum: true}).validate(0)).toThrow();
        expect(() => integer({minimum: 1, exclusiveMinimum: true}).validate(1)).toThrow();
        integer({minimum: 1, exclusiveMinimum: true}).validate(2);
      });
      it('maximum', () => {
        expect(() => integer({maximum: 1}).validate(2)).toThrow();
        integer({maximum: 1}).validate(1);
      });
      it('exclusiveMaximum', () => {
        expect(() => integer({maximum: 1, exclusiveMaximum: true}).validate(2)).toThrow();
        expect(() => integer({maximum: 1, exclusiveMaximum: true}).validate(1)).toThrow();
        integer({maximum: 1, exclusiveMaximum: true}).validate(0);
      });
      it('multipleOf', () => {
        expect(() => integer({multipleOf: 2}).validate(3)).toThrow();
        integer({multipleOf: 2}).validate(4);
      });
    });
    describe('number', () => {
      it('none', () => {
        float().validate(1.1);
      });
      it('minimum', () => {
        expect(() => float({minimum: 1}).validate(0)).toThrow();
        float({minimum: 1}).validate(1);
      });
      it('exclusiveMinimum', () => {
        expect(() => float({minimum: 1, exclusiveMinimum: true}).validate(0)).toThrow();
        expect(() => float({minimum: 1, exclusiveMinimum: true}).validate(1)).toThrow();
        float({minimum: 1, exclusiveMinimum: true}).validate(2);
      });
      it('maximum', () => {
        expect(() => float({maximum: 1}).validate(2)).toThrow();
        float({maximum: 1}).validate(1);
      });
      it('exclusiveMaximum', () => {
        expect(() => float({maximum: 1, exclusiveMaximum: true}).validate(2)).toThrow();
        expect(() => float({maximum: 1, exclusiveMaximum: true}).validate(1)).toThrow();
        float({maximum: 1, exclusiveMaximum: true}).validate(0);
      });
      it('multipleOf', () => {
        expect(() => float({multipleOf: 2}).validate(3)).toThrow();
        float({multipleOf: 2}).validate(4);
      });
    });
    describe('array', () => {
      it('none', () => {
        array(string()).validate([]);
        array(string()).validate(['1']);
      });
      it('minItems', () => {
        expect(() => array(string(), {minItems: 1}).validate([])).toThrow();
        array(string(), {minItems: 1}).validate(['1']);
      });
      it('maxItems', () => {
        expect(() => array(string(), {maxItems: 1}).validate(['1', '2'])).toThrow();
        array(string(), {maxItems: 1}).validate(['1']);
        array(string(), {maxItems: 1}).validate([]);
      });
      it('uniqueItems', () => {
        expect(() => array(string(), {uniqueItems: true}).validate(['1', '1'])).toThrow();
        array(string(), {uniqueItems: true}).validate(['1', '2']);

        // test struct deep equals and hashCode
        expect(() => array(struct({key: string()}), {uniqueItems: true}).validate([{key: '1'}, {key: '1'}])).toThrow();
        array(struct({key: string()}), {uniqueItems: true}).validate([{key: '1'}]);
      });
    });
    describe('map', () => {
      it('none', () => {
        map(string()).validate({key: '1'});
      });
      it('minProperties', () => {
        expect(() => map(string(), {minProperties: 1}).validate({})).toThrow();
        map(string(), {minProperties: 1}).validate({key: 'value'});
      });
      it('maxProperties', () => {
        expect(() => map(string(), {maxProperties: 1}).validate({key: 'value', key2: 'value2'})).toThrow();
        map(string(), {maxProperties: 1}).validate({key: 'value'});
        map(string(), {maxProperties: 1}).validate({});
      });
    });
  });

  describe('custom types', () => {
    it('custom path', () => {
      expect(jsonPath(tree).custom.customOperation()[TreeFields.path]).toEqual("$['custom']['arr'][0:1]");
    });
  });
});
