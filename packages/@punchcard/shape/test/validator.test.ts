import 'jest';

import { array, MaxLength, number, string, Type, Validator } from '../lib';

// tslint:disable: member-access
class Mock extends Type('Mock', {
  str: string
    .apply(MaxLength(1)),

  int: number,

  arr: array(string.apply(MaxLength(1)))
}) {}

const validator = Validator.of(Mock);

test('validator', () => {
  expect(validator(new Mock({
    str: '0',
    int: 1,
    arr: ['a']
  }), '$')).toEqual([]);

  expect(validator(new Mock({
    str: '012',
    int: 1,
    arr: ['a']
  }), '$')).toEqual([new Error(`at $['str']: expected string with length <= 1, but received: 012`)]);

  expect(validator(new Mock({
    str: '0',
    int: 1,
    arr: ['aa']
  }), '$')).toEqual([new Error(`at $['arr'][0]: expected string with length <= 1, but received: aa`)]);
});