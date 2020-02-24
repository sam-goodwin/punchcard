import { RecordType, ShapeOrRecord} from '@punchcard/shape';
import { Thing } from './thing';
import { Thread } from './thread';

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

type StepFunctionHandler<T extends ShapeOrRecord, U extends ShapeOrRecord> = (handler: (
  request: Thing.Of<T>,
  Return: (result: Thing.Of<U>) => void,
  Throw: (error: Thing) => void
) => void) => StateMachine<T, U> & ((request: Thing.Of<T>, callProps?: CallProps) => Thing.Of<U>);

export function StepFunction<T extends ShapeOrRecord, U extends ShapeOrRecord>(request: T, response: U): StepFunctionHandler<T, U> {
  return block => {
    Thread.run((Return, Throw) => {
      block(null as any, Return, Throw);
    });
    // TODO
    return new Proxy(new StateMachine(), {
      apply: (target, thisArg, args) => {
        return thisArg.call(...args);
      }
    }) as any;
  };
}

export const $function = StepFunction;

export namespace StepFunction {
  export function DSL<T extends RecordType>(type: T): T & {
    new: (members: {
      [M in keyof T['members']]: T['members'][M]
    }) => void
  } {
    return null as any;
  }
}
