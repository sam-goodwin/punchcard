import 'jest';

import { AttributeValue } from '../lib';
import { MyType } from './mock';

it('should map Shape AST to AttributeValue AST', () => {
  const actual: AttributeValue.ValueOfType<MyType> = null as any;

  // compile-time unit test
  const expected: AttributeValue.Struct<{
    id: AttributeValue.StringValue,
    count: AttributeValue.NumberValue,

    nested: AttributeValue.Struct<{
      a: AttributeValue.StringValue;
    }>,

    array: AttributeValue.List<AttributeValue.StringValue>,
    complexArray: AttributeValue.List<AttributeValue.Struct<{
      a: AttributeValue.StringValue;
    }>>,

    stringSet: AttributeValue.StringSet;
    numberSet: AttributeValue.NumberSet;

    map: AttributeValue.Map<AttributeValue.StringValue>;
    complexMap: AttributeValue.Map<AttributeValue.Struct<{
      a: AttributeValue.StringValue;
    }>>;
  }> = actual;
});
