import { Pointer, RecordShape } from '@punchcard/shape';
import { VObject } from './object';

export class VRecord<M extends { [m: string]: VObject; } = any> extends VObject<RecordShape<{
  [m in keyof M]: VObject.ShapeOf<Pointer.Resolve<M[m]>>;
}>> {}

export namespace VRecord {
  export type GetMembers<R extends VRecord> = R extends VRecord<infer M> ? M : any;
}

export type RecordClass<T extends VRecord = any> = (new(members: VRecord.GetMembers<T>) => T);
