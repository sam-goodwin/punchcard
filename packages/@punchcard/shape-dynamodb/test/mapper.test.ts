import 'jest';

import { HashSet } from '@punchcard/shape-runtime';
import { MaxLength } from '@punchcard/shape-validation';
import { binary, string } from '@punchcard/shape/lib/primitive';
import { Mapper } from '../lib';
import { MyType } from './mock';

const underTest = Mapper.of(MyType);

it('should read attribute values', () => {
  const complexValue = {
    M: {
      a: {
        S: 'complex value'
      }
    }
  };

  const actual = underTest.read({
    M: {
      array: {
        L: [{
          S: 'array value'
        }]
      },
      complexArray: {
        L: [complexValue]
      },
      complexMap: {
        M: {
          key: complexValue
        }
      },
      count: {
        N: '1'
      },
      id: {
        S: 'id'
      },
      map: {
        M: {
          key: {
            S: 'value'
          }
        }
      },
      nested: {
        M: {
          a: {
            S: 'nested value'
          }
        }
      },
      numberSet: {
        NS: ['1', '2']
      },
      stringSet: {
        SS: ['1', '2']
      },
      binaryField: {
        B: Buffer.from('binaryField', 'utf8')
      },
      binarySet: {
        BS: [Buffer.from('binarySet', 'utf8')] // test de-dupe
      },
      anyField: {
        S: 'any'
      },
      unknownField: {
        N: '1'
      }
    }
  });

  const expected: typeof actual = {
    array: ['array value'],
    complexArray: [{
      a: 'complex value'
    }],
    complexMap: {
      key: {
        a: 'complex value'
      }
    },
    count: 1,
    id: 'id',
    map: {
      key: 'value'
    },
    nested: {
      a: 'nested value'
    },
    numberSet: new Set([1, 2]),
    stringSet: new Set(['1', '2']),
    binaryField: Buffer.from('binaryField', 'utf8'),
    binarySet: new HashSet(binary).add(Buffer.from('binarySet', 'utf8')),
    anyField: 'any',
    unknownField: 1
  };

  expect(actual).toEqual(expected);
});

class T {
  public readonly id = string.apply(MaxLength(1));
}

it('should validate', () => {
  const m = Mapper.of(T);

  expect(() => m.read({
    M: {
      id: {
        S: '01'
      }
    }
  })).toThrowError('expected string with length <= 1, but received: 01');
});