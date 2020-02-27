import { array, integer, nothing, Record, string, timestamp, ShapeOrRecord, RecordType, StringShape, IntegerShape, PrimitiveShape, MakeRecordType, Value } from '@punchcard/shape';
import { App, Dependency, Client } from '../../lib/core';
import { Table } from '../../lib/dynamodb';
import { Queue } from '../../lib/sqs';
import { $, $catch, $delete, $else, $fail, $finally, $function, $get, $if, $parallel, $set, $state, $try, $while, Errors, List, State, Thing, $function2, Integer, String, SFN } from '../../lib/step-functions';

import DynamoDB = require('../../lib/dynamodb');
import { DDB } from '@punchcard/shape-dynamodb/lib/client';
import { $wait } from '../../lib/step-functions/wait';
import { Run } from '../../lib/core/run';

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

const ProcessString = $function(array(string), string)(function*(request) {
  const m = yield* request.map(function*(s) {
    return s;
  });

  const id2 = yield* $state('id2', string);

  return m[0];
});

// tslint:disable: ban-types

export const Counter = $function(array(string), string)(function*(request) {
  const { id } = yield* $state({
    id: array(string)
  });

  const id2 = yield* $state('id2', string);

  const a = $(id);


  // const li = yield* $(id).map(function*(i) {
  //   const a3 = yield* $var('a3', integer, );
  //   return i;
  // });

  return null as any;
});


export abstract class $Function<T extends ShapeOrRecord, U extends ShapeOrRecord> {
  constructor(public readonly request: T, public readonly response: U) {

  }

  public abstract apply<ID extends string>(request: State<Thing.Of<T>, ID>): Generator<unknown, Thing.Of<U>>;
}

export type LambdaFunctionHandler<T extends ShapeOrRecord, U extends ShapeOrRecord> = (event: Value.Of<T>) => Promise<Value.Of<U>>;
// export function LambdaFunction<T extends ShapeOrRecord, U extends ShapeOrRecord>(
//   input: T, output: U, f: () => Generator<unknown, LambdaFunctionHandler<T, U>>):
//     new(g: () => Generator) => Generator<unknown, LambdaFunctionHandler<T, U>> {
//       return null as any;
// }

class LambdaFunctionImpl<T extends ShapeOrRecord, U extends ShapeOrRecord> {
  constructor(handler: LambdaFunctionHandler<T, U>) {}
}

export function LambdaFunction<T extends ShapeOrRecord, U extends ShapeOrRecord>(
  t: T, u: U, handler: () => Generator<unknown, LambdaFunctionHandler<T, U>>):
    new() => Generator<unknown, LambdaFunctionImpl<T, U>> {
      return null as any;
}


export interface Infra<T> extends Generator<unknown , T> {}

export type Run<T> = Generator<unknown, T>;

function connect<D extends Dependency>(d: D): Generator<unknown, Client<D>> {
  return null as any;
}

export function Construct<T>(infra: () => Generator<unknown, T>): (new(id: string) => T) & {
  new: (id: string) => Generator<unknown, T>
} {
  return null as any;
}


function construct<T extends new(...args: any[]) => any>(type: T, ...args: ConstructorParameters<T>): Generator<unknown, InstanceType<T>> {

}

export function* application() {
  const t = yield* construct(MyServiceTable, 'table');

  const myService = new MyServiceTable(t);
}

export class Data extends Record({
  key: string
}) {}

export class MyServiceTable extends Table.of(Data, { partition: 'key' }) {}

// tslint:disable: ban-types
export class MyService {
  constructor(public readonly table: MyServiceTable) {}

  public *process(str: String): SFN<Integer> {
    // put data to DDB
    yield* $(this.table).put({
      key: str
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

  public *processAll(strings: List<String>): SFN<List<Integer>> {
    return yield* strings.map(this.process);
  }
}


// tslint:disable-next-line: new-parens
class Reader extends LambdaFunction(string, integer, function*() {
  const read = yield* connect(d.readAccess());

  return (async (str: string) => {
    const item = await read.get({
      key: 'key'
    });
    // await Run.resolve(read.bootstrap)(null as any, null as any);
    return 1;
  });
}) {}

