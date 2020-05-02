import 'jest';

import { AnyShape, optional, string, Value } from '@punchcard/shape';
import { AttributeValue } from '../lib';
import { MyType } from './mock';

it('should map Shape AST to AttributeValue AST', () => {
  const s: AttributeValue.ShapeOf<typeof MyType> = null as any;
  const actual: Value.Of<typeof s> = null as any;
  // compile-time unit test
  const expected: {
    M: {
      id: AttributeValue.String,
      count?: AttributeValue.Nothing | AttributeValue.Number,
      integer: AttributeValue.Number,

      nested: {
        M: {
          a: AttributeValue.String;
        }
      },

      array: AttributeValue.List<typeof AttributeValue.String>;
      complexArray: AttributeValue.List<AttributeValue.Struct<{
        a: typeof AttributeValue.String
      }>>;

      stringSet: AttributeValue.StringSet;
      numberSet: AttributeValue.NumberSet;

      map: AttributeValue.Map<typeof AttributeValue.String>;

      complexMap: AttributeValue.Map<AttributeValue.Struct<{
        a: typeof AttributeValue.String
      }>>;

      binaryField: AttributeValue.BinarySet;
      binarySet: AttributeValue.BinarySet;
      anyField: any;
    }
  } = actual;
});
