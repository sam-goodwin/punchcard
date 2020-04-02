import { Pointer, RecordShape } from '@punchcard/shape';
import { type, VObject } from './object';

export interface VRecordMembers {
  [m: string]: VObject;
}

export class VRecord<M extends VRecordMembers = {}> extends VObject<RecordShape<{
  [m in keyof M]: M[m][typeof type];
}>> {}

export namespace VRecord {
  export type GetMembers<R extends VRecord> = R extends VRecord<infer M> ? M : any;
}

export type RecordClass<T extends VRecord = any> = (new(members: VRecord.GetMembers<T>) => T);
