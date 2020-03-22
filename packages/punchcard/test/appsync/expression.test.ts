import 'jest';

import { $if, $util, VInterpreter, VObject } from '../../lib/appsync';

const sam = VObject.string('Sam');
const age = VObject.number`31`;

it('interpolation tests', () => {
  expect(VInterpreter.render(VObject.string`Hello ${sam} you are ${age} years old`)).toEqual(
`#set($var1 = "'Sam'")
Hello $var1 you are 31 years old`);

  expect(VInterpreter.render(VObject.string`your name has ${sam.size()} letters in it.`)).toEqual(
`#set($var1 = "'Sam'")
your name has $var1.size() letters in it.`);

  expect(VInterpreter.render($util.isNull(sam))).toEqual(
`#set($var1 = "'Sam'")
$util.isNull($var1)`);

  const id = $util.autoId();
  expect(VInterpreter.render(id.isEmpty())).toEqual(`$util.autoId().isEmpty()`);

  expect(VInterpreter.render(
$if(id.isEmpty(), () =>
  VObject.string('Hello')
).$else(() =>
  VObject.string('World')
))).toEqual(
`#set($var1 = "'Hello'")
#set($var2 = "'World'")
#if($util.autoId().isEmpty())
  $var1
#{else}
  $var2
#end`);

expect(VInterpreter.render(
$if($util.autoId().isEmpty(), () =>
  $if($util.autoId().isEmpty(), () =>
    $util.autoId()
  ).$else(() =>
    VObject.string('Hello')
  )
).$else(() =>
  VObject.string('World')
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
