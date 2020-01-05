import 'jest';

import { number, Shape, string, Meta } from '@punchcard/shape';
import { MaxLength, MinLength, Pattern } from '@punchcard/shape-validation';
import { array, map, set } from '@punchcard/shape/lib/collection';
import { JsonSchema } from '../lib';

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
    .apply(Pattern('.*'));

  count = number;
  nested = Nested;
  array = array(string);
  complexArray = array(Nested);
  set = set(string);
  complexSet = set(Nested);
  map = map(string);
  complexMap = map(Nested);
}

const type = Shape.of(MyType);
const schema = JsonSchema.of(type);

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
        type: 'number'
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
