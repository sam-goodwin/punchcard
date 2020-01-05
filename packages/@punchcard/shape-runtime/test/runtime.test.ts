import 'jest';

import { number, string } from '@punchcard/shape';
import { array, map, set } from '@punchcard/shape/lib/collection';

import { Runtime } from '../lib';

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
  set = set(string);
  complexSet = set(Nested);
  map = map(string);
  complexMap = map(Nested);
}

interface MyManufacturedInterface extends Runtime.OfType<MyType> {}

it('should derive runtime type recursively', () => {
  // compile-time unit test
  const actual: Runtime.OfType<MyType> = null as any;
  const expected: {
    id: string;
    count: number;

    nested: {
      a: string;
    };

    array: string[];
    complexArray: Array<{
      a: string
    }>;

    set: Set<string>;
    complexSet: Set<{
      a: string
    }>;

    map: { [key: string]: string; };
    complexMap: { [key: string]: {
      a: string;
    }; };
  } = actual;

  const expectedManufactured: MyManufacturedInterface = actual;
});
