import 'jest';

import { number, string } from '@punchcard/shape/lib/primitive';
import { MaxLength, Validator } from '../lib';

// tslint:disable: member-access
class Mock {
  str = string
    .apply(MaxLength(1));

  int = number;
}

const validator = Validator.of(Mock);

test('validator', () => {
  expect(validator({
    str: '0',
    int: 1
  })).toEqual([]);

  expect(validator({
    str: '012',
    int: 1
  })).toEqual([new Error(`expected string with length <= 1, but received: 012`)]);
});