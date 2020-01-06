import { number, string } from '@punchcard/shape';
import { array, map, set } from '@punchcard/shape/lib/collection';

import '../lib';

// tslint:disable: member-access
export class Nested {
  /**
   * This is a nested string.
   */
  a = string;
}

export class MyType {
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
