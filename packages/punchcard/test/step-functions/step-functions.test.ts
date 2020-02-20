import { array, boolean, integer, number, Record, string } from '@punchcard/shape';
import { $If, $if, $while, $While, Catch, Errors, ForEach, If, StepFunction, Try, While } from '../../lib/step-functions/';
import { Thing } from '../../lib/step-functions/thing';
import { $, $set } from '../../lib/step-functions/variable';

class B extends Record({
  key: string,
  items: array(string)
}).Deriving(Thing.DSL) {}

class A extends Record({
  key: string,
  items: array(B)
}).Deriving(Thing.DSL) {}

const ProcessString = StepFunction(string, number)((request, Return, Throw) => {
  const length = $('length', 1);

  Return($(length));
});

const DoWork = StepFunction(A, string)((request, Return, Fail) => {
  request.items
    .Filter(i => i.key.equals('value'))
    .ForEach(item => {
      ProcessString(item, {
        Retry: {
          ErrorEquals: [Errors.ALL],
          MaxAttempts: 5
        },
      });
    });

  const arr = $('arr', [1, 2]);

  const state = $('state', {
    a: 'string',
    b: [1, 2]
  });

  $while($(state).a.equals('string'), () => {
    $if($(arr)[0].equals(1), () => {
      state.$.b = $(request.items.Map(item => ProcessString(item.key)));
      const v1 = $set('v1', );
      //
    }).$else(() => {
      //
    });
  });

  // While($(state).a.equals(0), () => {
  //   If(request.key.equals('if'), () => {
  //     Return(A.new({
  //       items: request.items,
  //       key: request.key
  //     }) as any);
  //   }).ElseIf(request.key.equals('else-if'), () => {
  //     i.$ = $(i);
  //   }).Else(() => {
  //     Fail('error' as any);
  //   });
  // });

  ProcessString(null as any);

  Return(request.key);
});
