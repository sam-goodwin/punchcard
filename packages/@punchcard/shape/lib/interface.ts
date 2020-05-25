import { Fields, RecordShape } from './record';
import { Value } from './value';

// WIP - this code is currently not supported

export type Interface<
  FQN extends string,
  F extends Fields,
  Impl extends RecordShape<Fields, string>[]
  > = {
    FQN: FQN;
    Members: F;
    Implementations: {
      [fqn in Impl[Extract<keyof Impl, number>]['FQN']]: Extract<Impl[Extract<keyof Impl, number>], { FQN: fqn; }>
    }
  } & (new <T extends Value.Of<Impl[Extract<keyof Impl, number>]>>(value: T) => {
    Value: T
  });

export function Interface<
  FQN extends string,
  F extends Fields,
  Impl extends RecordShape<Fields, string>[]
>(FQN: FQN, fields: F, impl: Impl): Interface<FQN, F, Impl> {
  return class {
    public static readonly FQN = FQN;
    public static readonly Members = fields;
    public static readonly Implementations = impl.map(i => ({
      [i.FQN]: i
    })).reduce((a, b) => ({ ...a, ...b })) as any;
  } as any;
}