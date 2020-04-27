import { Record, RecordMembers, RecordType } from '@punchcard/shape';

export interface Interface<M extends RecordMembers = RecordMembers> {
  Members: M;
}
export const Interface = <M extends RecordMembers>(Members: M): Interface<M> => ({
  Members
});

export type Impl<M extends RecordMembers> =
  <M2 extends RecordMembers>(m2: M2) => RecordType<M & M2>
;
export function Impl<
  I1 extends Interface,
>(i1: I1): Impl<I1['Members']>;
export function Impl<
  I1 extends Interface,
  I2 extends Interface,
>(i1: I1, i2: I2): Impl<
  I1['Members'] & I2['Members']
>;
export function Impl<
  I1 extends Interface,
  I2 extends Interface,
  I3 extends Interface,
>(i1: I1,i2: I2,i3: I3): Impl<
  I1['Members'] & I2['Members'] & I3['Members']
>;
export function Impl(...i: Interface[]): Impl<{}> {
  return <M extends RecordMembers>(m: M) => Record({
    ...i.map(i => i.Members).reduce((a, b) => ({
      ...a,
      ...b,
    }), {}),
    ...m
  });
}