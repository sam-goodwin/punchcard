import 'jest';

import { number, string, StringShape } from '@punchcard/shape';
import { array, map, set } from '@punchcard/shape/lib/collection';
import { Annotation } from '@punchcard/shape/lib/metadata';
import { JsonSchema } from '../lib';

// tslint:disable: member-access
class Nested {
  a = string;
}

function MaxLength<L extends number>(length: L): Annotation<StringShape, {maxLength: L}> {
  return {
    maxLength: length,
  } as any;
}

class MyType {
  id = string
    .meta(MaxLength(1));

  count = number;
  nested = Nested;
  array = array(string);
  complexArray = array(Nested);
  set = set(string);
  complexSet = set(Nested);
  map = map(string);
  complexMap = map(Nested);
}

const schema = JsonSchema.of(MyType);

it('should render JSON schema', () => {
  expect(schema).toEqual({
    type: 'object',
    properties: {
      id: {
        type: 'string',
        maxLength: 1,
        exclusiveMaximum: false,
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
