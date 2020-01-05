import 'jest';

import { number, Shape, string } from '@punchcard/shape';
import { Maximum, MaxLength, Minimum, MinLength, MultipleOf, Pattern, Validator } from '@punchcard/shape-validation';
import { array, map, set } from '@punchcard/shape/lib/collection';
import { JsonSchema, NumberSchema } from '../lib';

// tslint:disable: member-access
class Nested {
  a = string;
}

class MyType {
  /**
   * Field documentation.
   */
  id = string
    .apply(MaxLength(1))
    .apply(MinLength(0))
    .apply(Pattern('.*'))
    ;

  count = number
    .apply(Maximum(1))
    .apply(Minimum(1, true))
    .apply(MultipleOf(2))
    ;

  nested = Nested;
  array = array(string);
  complexArray = array(Nested);
  set = set(string);
  complexSet = set(Nested);
  map = map(string);
  complexMap = map(Nested);
}

const type = Shape.of(MyType);
const schema: JsonSchema.OfType<MyType> = JsonSchema.of(MyType);

function requireEven(schema: NumberSchema<{multipleOf: 2}>) {
  // no-op
}

requireEven(schema.properties.count);

it('should render JSON schema', () => {
  expect(schema).toEqual({
    type: 'object',
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
      }
    }
  });
});
