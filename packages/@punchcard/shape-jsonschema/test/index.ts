import 'jest';

import { ClassShape, number, string } from '@punchcard/shape';
import { array } from '@punchcard/shape/lib/collection';
import { toJsonSchema } from '../lib';

// tslint:disable: member-access
class Nested {
  a = string;
}

class MyType {
  id = string;
  count = number;
  nested = Nested;
  array = array(string);
}

const schema = toJsonSchema(ClassShape.of(MyType));

it('should render JSON schema', () => {
  expect(schema).toEqual({
    type: 'object',
    properties: {
      id: {
        type: 'string'
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
      }
    }
  });
});
