import 'jest';

import {
  array,
  binary,
  boolean,
  float,
  integer,
  map,
  set,
  SetAction,
  string,
  struct,

  timestamp,
  toFacade,
} from '../../';
import { CompileContextImpl } from '../../lib/dynamodb/expression/compiler';

/**
 * TODO: Tests for optional attributes
 */
const table = {
  stringAttribute: string(),
  intAttribute: integer(),
  floatAttribute: float(),
  binaryAttribute: binary(),
  timestampAttribute: timestamp,
  boolAttribute: boolean,
  struct: struct({
    nested_id: integer()
  }),
  list: array(integer()),
  map: map(string()),
  intMap: map(integer()),
  stringSetAttribute: set(string()),
  intSetAttribute: set(integer()),
  floatSetAttribute: set(float()),
  binarySetAttribute: set(binary()),

  // for referencing other attributes in toPath
  other_stringAttribute: string(),
  other_intAttribute: integer(),
  other_floatAttribute: float(),
  other_binaryAttribute: binary(),
  other_timestampAttribute: timestamp,
  other_boolAttribute: boolean,
  other_struct: struct({
    nested_id: integer()
  }),
  other_list: array(integer()),
  other_map: map(string()),
  other_intMap: map(integer()),
  other_stringSetAttribute: set(string()),
  other_intSetAttribute: set(integer()),
  other_floatSetAttribute: set(float()),
  other_binarySetAttribute: set(binary()),
};

const facade = toFacade(table);

function render(u: SetAction<any, any>) {
  const context = new CompileContextImpl();
  const s = u.compile(context);
  return {
    UpdateExpression: s,
    ExpressionAttributeNames: context.names,
    ExpressionAttributeValues: context.values
  };
}

describe('update-expression', () => {
  describe('set', () => {
    describe('value', () => {
      it('boolean', () => {
        expect(render(facade.boolAttribute.set(true))).toEqual({
          UpdateExpression: '#0 = :0',
          ExpressionAttributeNames: {
            '#0': 'boolAttribute'
          },
          ExpressionAttributeValues: {
            ':0': { BOOL: true }
          }
        });
      });

      it('int', () => {
        expect(render(facade.intAttribute.set(1))).toEqual({
          UpdateExpression: '#0 = :0',
          ExpressionAttributeNames: {
            '#0': 'intAttribute'
          },
          ExpressionAttributeValues: {
            ':0': { N: '1' }
          }
        });
      });

      it('float', () => {
        expect(render(facade.floatAttribute.set(1.1))).toEqual({
          UpdateExpression: '#0 = :0',
          ExpressionAttributeNames: {
            '#0': 'floatAttribute'
          },
          ExpressionAttributeValues: {
            ':0': { N: '1.1' }
          }
        });
      });

      it('timestamp', () => {
        expect(render(facade.timestampAttribute.set(new Date(1)))).toEqual({
          UpdateExpression: '#0 = :0',
          ExpressionAttributeNames: {
            '#0': 'timestampAttribute'
          },
          ExpressionAttributeValues: {
            ':0': { N: '1' }
          }
        });
      });

      it('string', () => {
        expect(render(facade.stringAttribute.set('test'))).toEqual({
          UpdateExpression: '#0 = :0',
          ExpressionAttributeNames: {
            '#0': 'stringAttribute'
          },
          ExpressionAttributeValues: {
            ':0': { S: 'test' }
          }
        });
      });

      it('binary', () => {
        expect(render(facade.binaryAttribute.set(new Buffer('test')))).toEqual({
          UpdateExpression: '#0 = :0',
          ExpressionAttributeNames: {
            '#0': 'binaryAttribute'
          },
          ExpressionAttributeValues: {
            ':0': { B: new Buffer('test') }
          }
        });
      });

      it('struct', () => {
        expect(render(facade.struct.set({ nested_id: 1 }))).toEqual({
          UpdateExpression: '#0 = :0',
          ExpressionAttributeNames: {
            '#0': 'struct'
          },
          ExpressionAttributeValues: {
            ':0': {
              M: {
                nested_id: {
                  N: '1'
                }
              }
            }
          }
        });
      });

      it('struct attribute', () => {
        expect(render(facade.struct.fields.nested_id.set(1))).toEqual({
          UpdateExpression: '#0.#1 = :0',
          ExpressionAttributeNames: {
            '#0': 'struct',
            '#1': 'nested_id'
          },
          ExpressionAttributeValues: {
            ':0': {
              N: '1'
            }
          }
        });
      });

      it('map', () => {
        expect(render(facade.map.set({ key: 'test' }))).toEqual({
          UpdateExpression: '#0 = :0',
          ExpressionAttributeNames: {
            '#0': 'map'
          },
          ExpressionAttributeValues: {
            ':0': {
              M: {
                key: {
                  S: 'test'
                }
              }
            }
          }
        });
      });

      it('map key', () => {
        expect(render(facade.map.get('key').set('test'))).toEqual({
          UpdateExpression: '#0.#1 = :0',
          ExpressionAttributeNames: {
            '#0': 'map',
            '#1': 'key'
          },
          ExpressionAttributeValues: {
            ':0': {
              S: 'test'
            }
          }
        });
      });

      it('list', () => {
        expect(render(facade.list.set([1]))).toEqual({
          UpdateExpression: '#0 = :0',
          ExpressionAttributeNames: {
            '#0': 'list'
          },
          ExpressionAttributeValues: {
            ':0': {
              L: [{
                N: '1'
              }]
            }
          }
        });
      });

      it('list item', () => {
        expect(render(facade.list.get(1).set(1))).toEqual({
          UpdateExpression: '#0[1] = :0',
          ExpressionAttributeNames: {
            '#0': 'list'
          },
          ExpressionAttributeValues: {
            ':0': {
              N: '1'
            }
          }
        });
      });
    });

    describe('to another attribute', () => {
      it('boolean', () => {
        expect(render(facade.boolAttribute.set(facade.other_boolAttribute))).toEqual({
          UpdateExpression: '#0 = #1',
          ExpressionAttributeNames: {
            '#0': 'boolAttribute',
            '#1': 'other_boolAttribute',
          },
          ExpressionAttributeValues: {}
        });
      });

      it('int', () => {
        expect(render(facade.intAttribute.set(facade.other_intAttribute))).toEqual({
          UpdateExpression: '#0 = #1',
          ExpressionAttributeNames: {
            '#0': 'intAttribute',
            '#1': 'other_intAttribute',
          },
          ExpressionAttributeValues: {}
        });
      });

      it('float', () => {
        expect(render(facade.floatAttribute.set(facade.other_floatAttribute))).toEqual({
          UpdateExpression: '#0 = #1',
          ExpressionAttributeNames: {
            '#0': 'floatAttribute',
            '#1': 'other_floatAttribute',
          },
          ExpressionAttributeValues: {}
        });
      });

      it('timestamp', () => {
        expect(render(facade.timestampAttribute.set(facade.other_timestampAttribute))).toEqual({
          UpdateExpression: '#0 = #1',
          ExpressionAttributeNames: {
            '#0': 'timestampAttribute',
            '#1': 'other_timestampAttribute',
          },
          ExpressionAttributeValues: {}
        });
      });

      it('string', () => {
        expect(render(facade.stringAttribute.set(facade.other_stringAttribute))).toEqual({
          UpdateExpression: '#0 = #1',
          ExpressionAttributeNames: {
            '#0': 'stringAttribute',
            '#1': 'other_stringAttribute',
          },
          ExpressionAttributeValues: {}
        });
      });

      it('binary', () => {
        expect(render(facade.binaryAttribute.set(facade.other_binaryAttribute))).toEqual({
          UpdateExpression: '#0 = #1',
          ExpressionAttributeNames: {
            '#0': 'binaryAttribute',
            '#1': 'other_binaryAttribute',
          },
          ExpressionAttributeValues: {}
        });
      });

      it('struct', () => {
        expect(render(facade.struct.set(facade.other_struct))).toEqual({
          UpdateExpression: '#0 = #1',
          ExpressionAttributeNames: {
            '#0': 'struct',
            '#1': 'other_struct',
          },
          ExpressionAttributeValues: {}
        });
      });

      it('struct attribute', () => {
        expect(render(facade.struct.fields.nested_id.set(facade.other_struct.fields.nested_id))).toEqual({
          UpdateExpression: '#0.#1 = #2.#1',
          ExpressionAttributeNames: {
            '#0': 'struct',
            '#1': 'nested_id',
            '#2': 'other_struct'
          },
          ExpressionAttributeValues: {}
        });
      });

      it('map', () => {
        expect(render(facade.map.set(facade.other_map))).toEqual({
          UpdateExpression: '#0 = #1',
          ExpressionAttributeNames: {
            '#0': 'map',
            '#1': 'other_map',
          },
          ExpressionAttributeValues: {}
        });
      });

      it('map key', () => {
        expect(render(facade.map.get('key').set(facade.other_map.get('key')))).toEqual({
          UpdateExpression: '#0.#1 = #2.#1',
          ExpressionAttributeNames: {
            '#0': 'map',
            '#1': 'key',
            '#2': 'other_map'
          },
          ExpressionAttributeValues: {}
        });
      });

      it('list', () => {
        expect(render(facade.list.set(facade.other_list))).toEqual({
          UpdateExpression: '#0 = #1',
          ExpressionAttributeNames: {
            '#0': 'list',
            '#1': 'other_list',
          },
          ExpressionAttributeValues: {}
        });
      });

      it('list item', () => {
        expect(render(facade.list.get(1).set(facade.other_list.get(1)))).toEqual({
          UpdateExpression: '#0[1] = #1[1]',
          ExpressionAttributeNames: {
            '#0': 'list',
            '#1': 'other_list',
          },
          ExpressionAttributeValues: {}
        });
      });
    });

    describe('to another computation', () => {
      it('int', () => {
        expect(render(facade.intAttribute.set(facade.other_intAttribute.plus(1)))).toEqual({
          UpdateExpression: '#0 = #1 + :0',
          ExpressionAttributeNames: {
            '#0': 'intAttribute',
            '#1': 'other_intAttribute',
          },
          ExpressionAttributeValues: {
            ':0': { N: '1' }
          }
        });
      });

      it('float', () => {
        expect(render(facade.floatAttribute.set(facade.other_floatAttribute.plus(1.1)))).toEqual({
          UpdateExpression: '#0 = #1 + :0',
          ExpressionAttributeNames: {
            '#0': 'floatAttribute',
            '#1': 'other_floatAttribute',
          },
          ExpressionAttributeValues: {
            ':0': { N: '1.1' }
          }
        });
      });

      it('timestamp', () => {
        expect(render(facade.timestampAttribute.set(facade.other_timestampAttribute.plusMs(100)))).toEqual({
          UpdateExpression: '#0 = #1 + :0',
          ExpressionAttributeNames: {
            '#0': 'timestampAttribute',
            '#1': 'other_timestampAttribute',
          },
          ExpressionAttributeValues: {
            ':0': { N: '100' }
          }
        });
      });

      it('map key', () => {
        expect(render(facade.intMap.get('key').set(facade.other_intMap.get('key').plus(1)))).toEqual({
          UpdateExpression: '#0.#1 = #2.#1 + :0',
          ExpressionAttributeNames: {
            '#0': 'intMap',
            '#1': 'key',
            '#2': 'other_intMap'
          },
          ExpressionAttributeValues: {
            ':0': { N: '1' }
          }
        });
      });

      it('list item', () => {
        expect(render(facade.list.get(1).set(facade.other_list.get(1).plus(1)))).toEqual({
          UpdateExpression: '#0[1] = #1[1] + :0',
          ExpressionAttributeNames: {
            '#0': 'list',
            '#1': 'other_list',
          },
          ExpressionAttributeValues: {
            ':0': { N: '1' }
          }
        });
      });
    });
  });
});