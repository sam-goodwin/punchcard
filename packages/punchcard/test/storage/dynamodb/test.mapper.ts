import 'jest';

import { any, array, binary, boolean, double, DynamoDB, integer, set, Shape, string, struct } from '../../../lib';

const shape = {
  any,
  string: string(),
  binary: binary(),
  int: integer(),
  num: double(),
  bool: boolean,
  array: array(string()),
  set: set(string()),
  struct: struct({
    key: string()
  })
};

const mapper = DynamoDB.forShape(shape);

const richValue = {
  any: {
    some: 'value'
  },
  binary: Buffer.from('a buffer'),
  string: 'a string',
  int: 1,
  num: 1.2,
  bool: true,
  array: ['some', 'value'],
  set: new Set(['some', 'values']),
  struct: {
    key: 'value'
  },
};

const rawValue = {
  any: {
    M: {
      some: {
        S: 'value'
      }
    }
  },
  string: {
    S: 'a string'
  },
  binary: {
    B: Buffer.from('a buffer')
  },
  int: {
    N: '1'
  },
  num: {
    N: '1.2'
  },
  bool: {
    BOOL: true
  },
  array: {
    L: [{
      S: 'some'
    }, {
      S: 'value'
    }]
  },
  set: {
    SS: ['some', 'values']
  },
  struct: {
    M: {
      key: {
        S: 'value'
      }
    }
  }
};

it('should serialize JS object to AttributeMap', () => {
  expect(mapper.write(richValue)).toEqual(rawValue);
});

it('should deserialize AttributeMap to JS object', () => {
  const v = mapper.read(rawValue);
  expect({
    ...v,
    // Sets are wrapped in a special type, so unwrap it before comparing
    set: new Set(v.set.values())
  }).toEqual(richValue);
});
