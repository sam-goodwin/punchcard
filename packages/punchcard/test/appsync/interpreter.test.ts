import 'jest';

import { integer, string } from '@punchcard/shape';
import { App } from '../../lib/core';

import { ID, VInterpreter, VObject } from '../../lib/appsync';
import { $api } from '../../lib/appsync/syntax';
import Lambda = require('../../lib/lambda');

const sam = VObject.string('Sam');
const age = VObject.number`31`;

const app = new App();
const stack = app.stack('test');

const fn = new Lambda.Function(stack, 'fn', {
  request: string,
  response: integer,
}, async (request) => {
  return request.length;
});

it('should render resolver pipeline', () => {
  const a = $api({id: ID}, integer)
    .resolve('a', ({id}) => fn.invoke(id))
    .return('a')
  ;

  const pipeline = VInterpreter.interpret(a);

  expect(pipeline).toEqual({
    a: 1
  });
});