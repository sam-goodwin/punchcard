import 'jest';

import { any, binary, Enum, nothing, number, NumberShape, optional, Record, string, StringShape, union } from '@punchcard/shape';
import { Maximum, MaxLength, Minimum, MinLength, MultipleOf, Pattern } from '@punchcard/shape';
import { array, map, set } from '@punchcard/shape/lib/collection';
import { JsonSchema, NumberSchema, OneOf } from '../lib';

// tslint:disable: member-access
class Nested extends Record('Nested', {
  a: optional(string)
}) {}

class MyType extends Record('MyType', {
  /**
   * Field documentation.
   */
  id: string
    .apply(MaxLength(1))
    .apply(MinLength(0))
    .apply(Pattern('.*'))
  ,

  count: number
    .apply(Maximum(1))
    .apply(Minimum(1, true))
    .apply(MultipleOf(2))
  ,

  nested: Nested,
  array: array(string),
  complexArray: array(Nested),
  set: set(string),
  complexSet: set(Nested),
  map: map(string),
  complexMap: optional(map(Nested)),
  optionalUnion: union(nothing, string),
  stringOrNumber: union(string, number),

  binary: binary
    .apply(MaxLength(1))
  ,

  enum: Enum({
    Up: 'UP'
  } as const),

  any,

  nothing,
}) {}

// "stamp" an interface representing the JSON schema of MyType - sick code generation!
interface MyTypeJsonSchema extends JsonSchema.Of<typeof MyType> {}

const schema: MyTypeJsonSchema = JsonSchema.of(MyType);
function requireEven(schema: NumberSchema<{multipleOf: 2}>) {
  // no-op
}
requireEven(schema.properties.count);

it('should render JSON schema', () => {
  expect(schema).toEqual({
    type: 'object',
    required: [
      'id',
      'count',
      'nested',
      'array',
      'complexArray',
      'set',
      'complexSet',
      'map',
      'stringOrNumber',
      'binary',
      'enum',
      'any',
    ],
    properties: {
      enum: {
        type: 'string',
        enum: ['UP']
      },
      id: {
        type: 'string',
        maxLength: 1,
        minLength: 0,
        pattern: '.*'
      },
      count: {
        type: 'number',
        maximum: 1,
        exclusiveMaximum: false,
        minimum: 1,
        exclusiveMinimum: true,
        multipleOf: 2
      },
      nested: {
        type: 'object',
        properties: {
          a: {
            type: 'string'
          }
        }
      },
      array: {
        type: 'array',
        items: {
          type: 'string'
        },
        uniqueItems: false
      },
      complexArray: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            a: {
              type: 'string'
            }
          }
        },
        uniqueItems: false
      },
      optionalUnion: {
        type: 'string'
      },
      stringOrNumber: {
        oneOf: [{
          type: 'string'
        }, {
          type: 'number'
        }]
      },
      set: {
        type: 'array',
        items: {
          type: 'string'
        },
        uniqueItems: true
      },
      complexSet: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            a: {
              type: 'string'
            }
          }
        },
        uniqueItems: true
      },
      map: {
        type: 'object',
        properties: {},
        additionalProperties: {
          type: 'string'
        },
        allowAdditionalProperties: true
      },
      complexMap: {
        type: 'object',
        properties: {},
        additionalProperties: {
          type: 'object',
          properties: {
            a: {
              type: 'string'
            }
          }
        },
        allowAdditionalProperties: true
      },
      binary: {
        type: 'string',
        format: 'base64',
        maxLength: 1
      },
      any: {
        type: {}
      },
      nothing: {
        type: 'null'
      }
    }
  });

  // how fking awesome is it that the type-signature is the same as the value ^^
  const expected: {
    type: 'object',
    required: string[],
    properties: {
      id: {
        type: 'string',
        maxLength: 1,
        minLength: 0,
        pattern: '.*'
      },
      count: {
        type: 'number',
        maximum: 1,
        exclusiveMaximum: false,
        minimum: 1,
        exclusiveMinimum: true,
        multipleOf: 2
      },
      nested: {
        type: 'object',
        properties: {
          a: {
            type: 'string'
          }
        }
      },
      enum: {
        type: 'string',
        enum: 'UP'[]
      },
      array: {
        type: 'array',
        items: {
          type: 'string'
        },
        uniqueItems?: false
      },
      complexArray: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            a: {
              type: 'string'
            }
          }
        },
        uniqueItems?: false
      },
      optionalUnion: {
        type: 'string'
      },
      stringOrNumber: OneOf<[StringShape, NumberShape]>,
      set: {
        type: 'array',
        items: {
          type: 'string'
        },
        uniqueItems: true
      },
      complexSet: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            a: {
              type: 'string'
            }
          }
        },
        uniqueItems: true
      },
      map: {
        type: 'object',
        properties: {},
        additionalProperties: {
          type: 'string'
        },
        allowAdditionalProperties: true
      },
      complexMap: {
        type: 'object',
        properties: {},
        additionalProperties: {
          type: 'object',
          properties: {
            a: {
              type: 'string'
            }
          }
        },
        allowAdditionalProperties: true
      },
      binary: {
        type: 'string',
        format: 'base64',
        maxLength: 1
      },
      any: {
        type: {}
      },
      nothing: {
        type: 'null'
      }
    }
  } = schema;
});
