import { RecordType } from '@punchcard/shape';
import { Factory } from './dsl';
import { Object } from './object';

/**
 * Map a RecordShape to its corresponding VTL RecordObject type.
 */
export type MakeRecordObject<T extends RecordType> = Record<T> & {
  [M in keyof T['members']]: DSL<T['members'][M]>;
};

/**
 * A Record constructed in VTL:
 *
 * ```
 * {
 *   key: value
 * }
 * ```
 */
export class Record<T extends RecordType> extends Object<T> {}

export namespace Record {
  export interface Members {
    [memberName: string]: Object;
  }

  export function of<M extends Record.Members>(members: M) {
    // todo
  }
}