import 'jest';

import { number, string, StringShape } from '@punchcard/shape';
import { array, ArrayShape, map, set } from '@punchcard/shape/lib/collection';

import { AttributeValue } from '../lib';

// tslint:disable: member-access
class Nested {
  a = string;
}

class MyType {
  /**
   * Field documentation.
   */
  id = string;
  count = number;

  nested = Nested;
  array = array(string);
  complexArray = array(Nested);
  stringSet = set(string);
  numberSet = set(number);
  map = map(string);
  complexMap = map(Nested);
}

it('should map Shape AST to AttributeValue AST', () => {
  const actual: AttributeValue.ValueOfType<MyType> = null as any;

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
