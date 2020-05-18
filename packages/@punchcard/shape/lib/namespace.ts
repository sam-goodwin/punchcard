import { Record, RecordMembers, RecordType } from './record';

// TODO: considering supporting something like this ....
export function Namespace<Namespace extends string>(namespace: Namespace) {
  return {
    Class<ClassName extends string, M extends RecordMembers>(className: ClassName, members: M): RecordType<M, ClassName> & {
      Namespace: Namespace;
    } {
      const record = Record(className, members);
      (record as any).Namespace = namespace;
      return record as any;
    }
  } as const;
}

// usage:

// const SMA = Namespace('SMA');
// class Runtime extends SMA.Class('Runtime', {
//   key: string
// }) {}