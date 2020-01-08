import 'jest';

import { AttributeValue } from '../lib';
import { MyType } from './mock';

it('should map Shape AST to AttributeValue AST', () => {
  const actual: AttributeValue.OfType<MyType> = null as any;

  // compile-time unit test
  const expected: {
    M: {
      id: AttributeValue.StringValue,
      count?: AttributeValue.NumberValue,

      nested: {
        M: {
          a: AttributeValue.StringValue;
        }
      },

      array: {
        L: AttributeValue.StringValue[];
      },
      complexArray: {
        L: Array<{
          M: {
            a: AttributeValue.StringValue;
          }
        }>
      },

      stringSet: {
        SS: string[];
      };
      numberSet: {
        NS: string[];
      };

      map: {
        M: {
          [key: string]: AttributeValue.StringValue | undefined;
        }
      };
      complexMap: {
        M: {
          [key: string]: {
            M: {
              a: AttributeValue.StringValue
            }
          } | undefined;
        }
      };
      binaryField: {
        B: Buffer;
      },
      binarySet: {
        BS: Buffer[];
      },
      anyField: AttributeValue.Type;
      unknownField: AttributeValue.Type;
    }
  } = actual;
});
