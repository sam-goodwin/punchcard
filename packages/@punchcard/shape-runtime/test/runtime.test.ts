import 'jest';

import { array, bool, map, number, Optional, set, string, } from '@punchcard/shape';

import { Value } from '../lib';

// tslint:disable: member-access
class Nested {
  a = string;
}

class MyType {
  /**
   * Field documentation.
   */
  id = string
    .apply(Optional);

  count = number;
  bool = bool;

  nested = Nested;
  array = array(string);
  complexArray = array(Nested);
  set = set(string);
  complexSet = set(Nested);
  map = map(string);
  complexMap = map(Nested);
}

interface MyManufacturedInterface extends Value.Of<typeof MyType> {}

it('should derive runtime type recursively', () => {
  // compile-time unit test
  const actual: Value.Of<typeof MyType> = null as any;
  const expected: {
    id?: string;
    count: number;
    bool: boolean;

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
