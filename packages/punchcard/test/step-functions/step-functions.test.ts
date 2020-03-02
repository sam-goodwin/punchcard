import cdk = require('@aws-cdk/core');

import { array, integer, IntegerShape, MakeRecordType, map, nothing, number, PrimitiveShape, Record, RecordType, ShapeOrRecord, string, StringShape, timestamp, Value } from '@punchcard/shape';
import { AttributeValue } from '@punchcard/shape-dynamodb';
import { App, Client, Dependency } from '../../lib/core';
import { Build } from '../../lib/core/build';
import { Table } from '../../lib/dynamodb';
import DynamoDB = require('../../lib/dynamodb');
import { Queue } from '../../lib/sqs';
import { $, $catch, $delete, $else, $fail, $finally,  $function2, $get, $if, $lit, $parallel, $pass, $set, $try, $while, Errors, Integer, List, SFN, State, String, Thing } from '../../lib/step-functions';
import { $wait } from '../../lib/step-functions/wait';

class Nested extends Record({
  key: string
}) {}

class Data extends Record({
  key: string,
  items: array(string),
  tags: map(string),
  /**
   * Nested
   */
  nested: Nested
}) {}

// tslint:disable: ban-types

class MyConstruct {
  public readonly queue: Queue<typeof Data>;
  public readonly table: Table<typeof Data, { partition: 'key'; }>;

  constructor(scope: Build<cdk.Construct>, id: string) {
    this.queue = new Queue(stack, 'Queue', {
      shape: Data
    });
    this.table = new DynamoDB.Table(scope, 'Table', {
      data: Data,
      key: {
        partition: 'key'
      }
    });
  }

  public *processAll(strings: List<String>): SFN<List<Integer>> {
    return yield* strings.map(this.process);
  }

  public *process(str: String): SFN<Integer> {
    // put data to DDB
    const resp = yield* $set('id', $(this.queue).sendMessage({
      key: str,
      items: [
        'a',
        str
      ],
      nested: {
        key: ''
      },
      tags: {
        t1: '',
        t2: str
      }
    }));

    yield* $(this.table).put({
      key: {
        S: str
      },
      items: {
        L: [{
          S: ''
        }]
      },
      nested: null as any,
      tags: {
        M: {
          a: {
            S: ''
          }
        }
      }
    });

    const l = yield* $pass('id', AttributeValue.shapeOf(array(string)), {
      L: [{
        S: $(resp).MessageId
      }]
    });

    const ll = $(l);

    const tags = yield* $pass('tags', map(string), {
      key: 'value'
    });

    yield* $(this.table).put({
      key: {
        S: $(tags).get('key')
      },
      items: $(l),
      nested: {
        M: {
          key: {
            S: ''
          }
        }
      },
      tags: {
        M: {
          t1: {
            S: 'tag'
          },
          t2: {
            S: str
          }
        }
      }
    });

    const length = yield* $if(str.equals(''), function*() {
      return str.length;
    }, $else(function*() {
      return str.length;
    }));

    yield* $while(length.greaterThan(10), function*() {
      yield* $wait(10);
    });

    return length;
  }
}

const app = new App();
const stack = app.stack('test');

export const table = new Table(stack, 'table', {
  data: Data,
  key: {
    partition: 'key'
  }
});

export const con = new MyConstruct(stack, 'id');
