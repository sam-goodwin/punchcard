import 'jest';

import { AttributeValue } from '../lib';
import { MyType } from './mock';

it('should map Shape AST to AttributeValue AST', () => {
  const actual: AttributeValue.OfType<MyType> = null as any;

  // compile-time unit test
  const expected: {
    M: {
      id: AttributeValue.StringValue,
      count: AttributeValue.NumberValue,

      nested: {
        M: {
          a: AttributeValue.StringValue;
        }
      },

      array: AttributeValue.List<AttributeValue.StringValue>,
      complexArray: AttributeValue.List<{
        M: {
          a: AttributeValue.StringValue;
        }
      }>,

      stringSet: AttributeValue.StringSet;
      numberSet: AttributeValue.NumberSet;

      map: AttributeValue.Map<AttributeValue.StringValue>;
      complexMap: AttributeValue.Map<{
        M: {
          a: AttributeValue.StringValue;
        }
      }>;
    }
  } = actual;
});
