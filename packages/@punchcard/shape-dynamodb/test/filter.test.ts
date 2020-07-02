import 'jest';

import { Condition, DSL } from '../lib';
import { MyType } from './mock';

const _ = DSL.of(MyType);

test('enumProperty = literal', () => {
  expect(Condition.compile(_.direction.equals('UP'))).toEqual({
    Expression: '#1=:1',
    ExpressionAttributeNames: {
      '#1': 'direction'
    },
    ExpressionAttributeValues: {
      ':1': {
        S: 'UP'
      }
    },
  });
});

test('stringProperty = stringLiteral', () => {
  expect(Condition.compile(_.id.equals('value'))).toEqual({
    Expression: '#1=:1',
    ExpressionAttributeNames: {
      '#1': 'id'
    },
    ExpressionAttributeValues: {
      ':1': {
        S: 'value'
      }
    },
  });
});

test('stringProperty BETWEEN a AND b', () => {
  expect(Condition.compile(_.id.between('a', 'b'))).toEqual({
    Expression: '#1 BETWEEN :1 AND :2',
    ExpressionAttributeNames: {
      '#1': 'id'
    },
    ExpressionAttributeValues: {
      ':1': { S: 'a' },
      ':2': { S: 'b' }
    },
  });
});

test('array[index] = stringiteral', () => {
  expect(Condition.compile(_.array[0].equals('string'))).toEqual({
    Expression: '#1[0]=:1',
    ExpressionAttributeNames: {
      '#1': 'array'
    },
    ExpressionAttributeValues: {
      ':1': {
        S: 'string'
      }
    },
  });
});

test('struct.field = stringLiteral', () => {
  expect(Condition.compile(_.nested.fields.a.equals('string'))).toEqual({
    Expression: '#1.#2=:1',
    ExpressionAttributeNames: {
      '#1': 'nested',
      '#2': 'a'
    },
    ExpressionAttributeValues: {
      ':1': {
        S: 'string'
      },
    },
  });
});

test('struct.field = array.get(index)', () => {
  expect(Condition.compile(_.nested.fields.a.equals(_.array.get(0)))).toEqual({
    Expression: '#1.#2=#3[0]',
    ExpressionAttributeNames: {
      '#1': 'nested',
      '#2': 'a',
      '#3': 'array'
    }
  });
});
