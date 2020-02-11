import 'jest';

import { DSL } from '../lib';
import { Update } from '../lib/update';
import { MyType } from './mock';

const _ = DSL.of(MyType);

test('stringProperty = stringLiteral', () => {
  expect(Update.compile([
    _.id.set('value')
  ])).toEqual({
    UpdateExpression: 'SET #1=:1',
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

test('stringProperty = if_not_exists(stringProperty, "a")', () => {
  expect(Update.compile([
    _.id.set(_.id.ifNotExists('value'))
  ])).toEqual({
    UpdateExpression: 'SET #1=if_not_exists(#1,:1)',
    ExpressionAttributeNames: {
      '#1': 'id'
    },
    ExpressionAttributeValues: {
      ':1': {
        S: 'value'
      }
    },
  });

  expect(Update.compile([
    _.id.setIfNotExists('value')
  ])).toEqual({
    UpdateExpression: 'SET #1=if_not_exists(#1,:1)',
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

test('repeated clauses', () => {
  expect(Update.compile([
    _.id.set('value'),
    _.id.set('value'),
  ])).toEqual({
    UpdateExpression: 'SET #1=:1, #1=:2',
    ExpressionAttributeNames: {
      '#1': 'id'
    },
    ExpressionAttributeValues: {
      ':1': {
        S: 'value'
      },
      ':2': {
        S: 'value'
      }
    },
  });
});

test('list-push', () => {
  expect(Update.compile([
    _.array.push('value')
  ])).toEqual({
    UpdateExpression: 'SET #1[1]=:1',
    ExpressionAttributeNames: {
      '#1': 'array'
    },
    ExpressionAttributeValues: {
      ':1': {
        S: 'value'
      }
    },
  });
});

test('list-append', () => {
  expect(Update.compile([
    _.array.pushAll(['value'])
  ])).toEqual({
    UpdateExpression: 'SET #1=list_append(#1,:1)',
    ExpressionAttributeNames: {
      '#1': 'array'
    },
    ExpressionAttributeValues: {
      ':1': {
        L: [{
          S: 'value'
        }]
      }
    },
  });
});

test('prop = list_append(a, b)', () => {
  expect(Update.compile([
    _.array.set(_.array.concat(['a']))
  ])).toEqual({
    UpdateExpression: 'SET #1=list_append(#1,:1)',
    ExpressionAttributeNames: {
      '#1': 'array'
    },
    ExpressionAttributeValues: {
      ':1': {
        L: [{
          S: 'a'
        }]
      }
    },
  });
});

test('increment', () => {
  expect(Update.compile([
    _.count.increment()
  ])).toEqual({
    UpdateExpression: 'SET #1=#1+:1',
    ExpressionAttributeNames: {
      '#1': 'count'
    },
    ExpressionAttributeValues: {
      ':1': {
        N: '1'
      }
    }
  });
});
