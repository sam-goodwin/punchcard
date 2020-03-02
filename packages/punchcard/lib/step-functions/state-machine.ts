import { integer, RecordType, ShapeOrRecord, unknown} from '@punchcard/shape';
import { $, $pass, $set } from './eval';
import { State } from './state';
import { Integer, String, Thing } from './thing';

export class StateMachine<T extends ShapeOrRecord, U extends ShapeOrRecord> {
  // public call(request: Thing.Of<T>): Thing.Of<U> {

  // }
}

export interface RetryPolicy {
  ErrorEquals: string | string[];
  IntervalSeconds?: number;
  MaxAttempts?: number;
  BackoffRate?: number;
}

export interface CallProps {
  Retry?: RetryPolicy;
}

export function $function2(props: {
  block: (t: any) => Generator<any, any, any>
}): any {

return null as any;
}

export namespace StepFunction {
  export function DSL<T extends RecordType>(type: T): T & {
    new: (members: {
      [M in keyof T['members']]: T['members'][M]
    }) => void
  } {
    return null as any;
  }
}
