import { array, Record, string } from '@punchcard/shape';
import { $, $delete, $function, $if, $parallel, $try, $while, Errors, Thing } from '../../lib/step-functions';

class B extends Record({
  key: string,
  items: array(string)
}).Deriving(Thing.DSL) {}

class A extends Record({
  key: string,
  items: array(B)
}).Deriving(Thing.DSL) {}

const ProcessString = $function(string, string)((request, Return, Throw) => {

  Return(request);
});

const DoWork = $function(A, string)(
  (request, $return, $fail) => {
    const arr = $('arr', '=', [1, 2]);
    const a = $('arr', '=', new A({
      key: 'a',
      items: []
    }));
    const arr2 = $('arr2', ':', array(string), '=', ['1', '2']);
    const arr3 = $('arr2', ':', array(string), '=', arr2);

    $(arr3, '=', $(arr2));
    $(arr2, '=', ['string']);

    $(a, '=', new A({
      key: '',
      items: []
    }));

    // overwrite state
    $(arr[0], '=', arr[1]);

    // arr.$[0] = $(arr)[1];

    const job = $('job', '=', {
      name: 'string',
      ids: ['1', '2']
    });

    $(job).ids.forEach(id => {
      const processed = $('processed', '=', ProcessString(id));
    });

    $while($(job).name.equals('string'), () => {
      $if($(arr)[0].equals(1), () => {
        $try(() => {
          $(request.items.map(item => ProcessString(item.key, {
            Retry: {
              ErrorEquals: [Errors.ALL],
              MaxAttempts: 5
            }
          })));

          $(job, '=', request.items.map(item => ProcessString(item.key, {
            Retry: {
              ErrorEquals: [Errors.ALL],
              MaxAttempts: 5
            }
          })));

          const j = $('jobs', '=', request.items.map(item => ProcessString(item.key)));
        }).$catch(Errors.ALL, () => {
          // todo
          job.$.ids = []  as any;
        }).$finally(() => {
          // finally
        });

        $(job).ids.forEach(item => {
          //
        });

        $delete(arr);
      }).$else(() => {
        job.$.ids = request.items
          .filter(item => item.key.equals('key'))
          .map(item => ProcessString(item.key));
      });
    });

    $parallel([
      request.items.map(item => ProcessString(item.key)),
    ]);

    $return($(job).name);
  }
);
