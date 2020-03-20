import 'jest';

import { $if } from '../../lib/appsync';
import { GraphQL } from '../../lib/appsync/graphql';
import { Frame } from '../../lib/appsync/intepreter/frame';

const sam = GraphQL.string('Sam');
const age = GraphQL.number`31`;

function render(type: GraphQL.Type): string {
  const frame = new Frame(undefined, new Frame());
  frame.interpret(type);
  // console.log(frame);
  return frame.render();
}

it('interpolation tests', () => {
  expect(render(GraphQL.string`Hello ${sam} you are ${age} years old`)).toEqual(
`#set($var1 = "'Sam'")
Hello $var1 you are 31 years old`);

  expect(render(GraphQL.string`your name has ${sam.size()} letters in it.`)).toEqual(
`#set($var1 = "'Sam'")
your name has $var1.size() letters in it.`);

  expect(render(GraphQL.$util.isNull(sam))).toEqual(
`#set($var1 = "'Sam'")
$util.isNull($var1)`);

  const id = GraphQL.$util.autoId();
  expect(render(id.isEmpty())).toEqual(`$util.autoId().isEmpty()`);

  expect(render(
$if(id.isEmpty(), () =>
  GraphQL.string('Hello')
).$else(() =>
  GraphQL.string('World')
))).toEqual(
`#set($var1 = "'Hello'")
#set($var2 = "'World'")
#if($util.autoId().isEmpty())
  $var1
#{else}
  $var2
#end`);

expect(render(
$if(GraphQL.$util.autoId().isEmpty(), () =>
  $if(GraphQL.$util.autoId().isEmpty(), () =>
    GraphQL.$util.autoId()
  ).$else(() =>
    GraphQL.string('Hello')
  )
).$else(() =>
  GraphQL.string('World')
))).toEqual(
  `#set($var1 = "'Hello'")
#set($var2 = "'World'")
#if($util.autoId().isEmpty())
  #if($util.autoId().isEmpty())
    $util.autoId()
  #{else}
    $var1
  #end
#{else}
  $var2
#end`);
});
