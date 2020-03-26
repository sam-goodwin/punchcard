import 'jest';

import { Record } from '@punchcard/shape';
import { $util, VInterpreter, VNumber, VString, VTL } from '../../lib/appsync';
import { $if } from '../../lib/appsync/syntax/if';

class A extends Record({}) {}

// const myComponent = (name: VString, age: VNumber) => VTL.typed(A)`
// #if(${name.isEmpty()})
//   hello
// #else
//   goodbye
// #end
// `;


const sam = VTL.string('Sam');
// const age = VTL.number`31`;
const age = VTL.number(31);

it('interpolation tests', () => {
  let template = VInterpreter.render(VTL.string`Hello ${sam} you are ${age} years old`);
  expect(template).toEqual(`Hello #set($var1 = "Sam")$var1 you are #set($var2 = 31)$var2 years old`);

  template = VInterpreter.render(VTL.string`your name has ${sam.size()} letters in it.`);
  expect(template).toEqual(`your name has #set($var1 = "Sam")$var1.size() letters in it.`);

  expect(VInterpreter.render($util.isNull(sam))).toEqual(
`$util.isNull(#set($var1 = "Sam")$var1)`);

  const id = $util.autoId();
  expect(VInterpreter.render(id.isEmpty())).toEqual(`$util.autoId().isEmpty()`);

  expect(VInterpreter.render(
$if(id.isEmpty(), () =>
  VTL.string('Hello')
).$else(() =>
  VTL.string('World')
))).toEqual(
`#if($util.autoId().isEmpty())
  #set($var1 = "Hello")$var1
#{else}
  #set($var2 = "World")$var2
#end`);

expect(VInterpreter.render(
$if(id.isEmpty(), () =>
  $if($util.autoId().isEmpty(), () =>
    $util.autoId()
  ).$else(() =>
    VTL.string('Hello')
  )
).$else(() =>
  VTL.string('World')
))).toEqual(
`#if($util.autoId().isEmpty())
  #if($util.autoId().isEmpty())
    $util.autoId()
  #{else}
    #set($var1 = "Hello")$var1
  #end
#{else}
  #set($var2 = "World")$var2
#end`);
});
