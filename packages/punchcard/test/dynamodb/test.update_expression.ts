import 'jest';

import { DynamoDB, Shape } from '../../lib';

/**
 * TODO: Tests for optional attributes
 */
const table = {
  anyAttribute: Shape.dynamic,
  stringAttribute: Shape.string(),
  intAttribute: Shape.integer(),
  floatAttribute: Shape.float(),
  binaryAttribute: Shape.binary(),
  timestampAttribute: Shape.timestamp,
  boolAttribute: Shape.boolean,
  struct: Shape.struct({
    nested_id: Shape.integer()
  }),
  list: Shape.array(Shape.integer()),
  map: Shape.map(Shape.string()),
  intMap: Shape.map(Shape.integer()),
  stringSetAttribute: Shape.set(Shape.string()),
  intSetAttribute: Shape.set(Shape.integer()),
  floatSetAttribute: Shape.set(Shape.float()),
  binarySetAttribute: Shape.set(Shape.binary()),

  // for referencing other attributes in toPath
  other_stringAttribute: Shape.string(),
  other_intAttribute: Shape.integer(),
  other_floatAttribute: Shape.float(),
  other_binaryAttribute: Shape.binary(),
  other_timestampAttribute: Shape.timestamp,
  other_boolAttribute: Shape.boolean,
  other_struct: Shape.struct({
    nested_id: Shape.integer()
  }),
  other_list: Shape.array(Shape.integer()),
  other_map: Shape.map(Shape.string()),
  other_intMap: Shape.map(Shape.integer()),
  other_stringSetAttribute: Shape.set(Shape.string()),
  other_intSetAttribute: Shape.set(Shape.integer()),
  other_floatSetAttribute: Shape.set(Shape.float()),
  other_binarySetAttribute: Shape.set(Shape.binary()),
};

const facade = DynamoDB.toFacade(table);

function render(u: DynamoDB.SetAction<any>) {
  const context = new DynamoDB.CompileContextImpl();
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
      it('dynamic', () => {
        expect(render(facade.anyAttribute.as(Shape.boolean).set(true))).toEqual({
          UpdateExpression: '#0 = :0',
          ExpressionAttributeNames: {
            '#0': 'anyAttribute'
          },
          ExpressionAttributeValues: {
            ':0': { BOOL: true }
          }
        });
      });

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
      it('dynamic', () => {
        expect(render(facade.anyAttribute.as(Shape.boolean).set(facade.other_boolAttribute))).toEqual({
          UpdateExpression: '#0 = #1',
          ExpressionAttributeNames: {
            '#0': 'anyAttribute',
            '#1': 'other_boolAttribute',
          },
          ExpressionAttributeValues: {}
        });
      });

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
      it('dynamic', () => {
        expect(render(facade.anyAttribute.as(Shape.integer()).set(facade.other_intAttribute.plus(1)))).toEqual({
          UpdateExpression: '#0 = #1 + :0',
          ExpressionAttributeNames: {
            '#0': 'anyAttribute',
            '#1': 'other_intAttribute',
          },
          ExpressionAttributeValues: {
            ':0': { N: '1' }
          }
        });
      });

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