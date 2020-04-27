import 'jest';

import { AnyShape, optional, string, Value } from '@punchcard/shape';
import { AttributeValue } from '../lib';
import { MyType } from './mock';

it('should map Shape AST to AttributeValue AST', () => {
  const actual: AttributeValue.ShapeOf<typeof MyType> = null as any;
  const b = actual;
  // compile-time unit test
  const expected: {
    id: typeof AttributeValue.String,
    count?: typeof AttributeValue.Nothing | typeof AttributeValue.Number,
    integer: typeof AttributeValue.Number,

    nested: {
      M: {
        a: typeof AttributeValue.String;
      }
    },

    array: AttributeValue.List<typeof AttributeValue.String>;
    complexArray: AttributeValue.List<AttributeValue.Struct<{
      a: typeof AttributeValue.String
    }>>;

    stringSet: typeof AttributeValue.StringSet;
    numberSet: typeof AttributeValue.NumberSet;

    map: AttributeValue.Map<typeof AttributeValue.String>;

    complexMap: AttributeValue.Map<AttributeValue.Struct<{
      a: typeof AttributeValue.String
    }>>;

    binaryField: typeof AttributeValue.BinarySet;
    binarySet: typeof AttributeValue.BinarySet;
    anyField: AnyShape;
    unknownField: AnyShape;
  } = actual.M;
});
