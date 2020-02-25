import { array, integer, nothing, Record, string, timestamp } from '@punchcard/shape';
import { App } from '../../lib/core';
import { Table } from '../../lib/dynamodb';
import { Queue } from '../../lib/sqs';
import { $, $catch, $delete, $else, $fail, $finally, $function, $if, $parallel, $try, $while, Errors, Thing } from '../../lib/step-functions';
import { List } from '../../lib/step-functions/list';
import { Integer, String } from '../../lib/step-functions/thing';
import { $wait } from '../../lib/step-functions/wait';

class B extends Record({
  key: string,
  items: array(string)
}).Deriving(Thing.DSL) {}

class A extends Record({
  key: string,
  items: array(B)
}).Deriving(Thing.DSL) {}

const app = new App();
const stack = app.stack('test');

const table = new Table(stack, 'table', {
  data: B,
  key: {
    partition: 'key'
  }
});

const queue = new Queue(stack, 'queue', {
  shape: string
});

const ProcessString = $function(string, string)((request, $return, $fail) => {
  $return(request);
});

// tslint:disable: ban-types

export function StringLengths(list: List<String>): List<Integer> {
  return list.map(item => item.length);
}

export const Counter = $function(nothing, nothing)(function*(request) {
  const { counter, ts } = yield* $({
    counter: integer,
    ts: timestamp
  });

  yield* $(counter, '=', 0);

  yield* $while($(ts).greaterThan(new Date()), function*() {
    yield $(counter, '=', 1);
  });
});

function* b() {
  const { id } = yield* $({
    id: string
  });

  function* send(id: String) {
    return yield* $if(id.equals('id'), function*() {
      yield* $(queue).sendMessage(null as any);
    }, $else(function*() {
      // no-op
      throw $fail(null);
    }));
  }

  function* safeSend() {
    return yield* $try(function*() {
      return yield* $if($(id).equals('f'), function*() {
        const response = yield* $(queue).sendMessage(null as any);

        yield* $(id, '=', response.MessageId);

        return $(id);
      }, $else(function*() {
        yield* $(id, '=', 'f');

        throw $fail('todo');
      }));
    }, $catch(Errors.ALL, function*() {
      throw $fail('todo');
    }, $finally(function*() {
      $delete(id);
    })));
  }

  const results = yield* $parallel(
    send($(id)),
    safeSend()
  );
}

/*
function*() {
  const table = yield* DynamoDB.Table('table', {
    data: Data,
    key: {
      partition: 'key'
    }
  });

  yield* Stack('stack', function*() {
    return yield* Lambda.Function('handler', function*(event) {
      const result = yield* event.map(e => e.length);

      yield* $(table).put({
        key: $(event.key)
      });
    }, {
      memorySize: 128
    });
  });

  yield* table.resource.map(table => {
    table.addSortKey(..);
  });

  const fn = yield* Step(function*(id: String) {
    return yield* $if(id.equals('0'), function*() {
      return yield* id.length
    }, $else(function*() {
      throw $fail(null);
    }));
  });
}

const state = $('state', '=', 1);

$if(state.id.equals('id), () => {
  transition(state);
}, $else(() => {
  transition(state);
}))
*/
