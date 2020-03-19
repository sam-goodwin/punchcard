import 'jest';

import { GraphQL } from '../../lib/appsync';
import { Frame } from '../../lib/appsync/intepreter/frame';

const sam = GraphQL.string('Sam');
const age = GraphQL.number`31`;

function render(type: GraphQL.Type): string {
  const context = new Frame();
  GraphQL.render(type, context);
  return context.render();
}

it('interpolation tests', () => {
  expect(render(GraphQL.string`Hello ${sam} you are ${age} years old`))
    .toEqual('Hello Sam you are 31 years old');

  expect(render(GraphQL.string`your name has ${sam.size()} letters in it.`))
    .toEqual(`#set($var1 = "'Sam'")your name has $var1.size() letters in it.`);

  expect(render(GraphQL.$util.isNull(sam)))
    .toEqual(`$util.isNull(#set($var1 = 'Sam')$var1)`);
});
