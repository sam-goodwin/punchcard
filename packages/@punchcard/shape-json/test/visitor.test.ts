import 'jest';

import { number, Shape, string, StringShape } from '@punchcard/shape';
import { array, map, set } from '@punchcard/shape/lib/collection';
import { Meta, Trait } from '@punchcard/shape/lib/metadata';
import { JsonSchema, StringSchema } from '../lib';

// tslint:disable: member-access
class Nested {
  a = string;
}

// type MaxLength<L extends number> = Trait<StringShape, {maxLength: L}>;
interface MaxLength<L extends number> extends Trait<StringShape, {maxLength: L}> {}
interface MinLength<L extends number> extends Trait<StringShape, {minLength: L}> {}

function MaxLength<L extends number>(length: L): MaxLength<L> {
  return {
    maxLength: length
  } as any;
}

function MinLength<L extends number>(length: L): MinLength<L> {
  return {
    minLength: length,
  } as any;
}

interface Pattern<P extends string> extends Trait<StringShape, {pattern: P}> {}
function Pattern<P extends string>(pattern: P): Pattern<P> {
  return {
    pattern
  } as any;
}

class MyType {
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
