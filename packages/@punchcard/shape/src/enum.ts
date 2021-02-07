import { Shape } from './shape';

export function Enum<FQN extends string, T extends readonly string[] | EnumValues>(fqn: string, values: T): EnumShape<EnumValues.From<T>, FQN>;
export function Enum<T extends readonly string[] | EnumValues>(values: T): EnumShape<EnumValues.From<T>, undefined>;
export function Enum(a: any, b?: any): EnumShape<any, any> {
  return typeof a === 'string' ? new EnumShape(enumValues(b), a) : new EnumShape(enumValues(a), undefined);
}
function enumValues(v: readonly string[] | EnumValues): EnumValues {
  if (Array.isArray(v)) {
    return v.map(s => ({[s]: s})).reduce((a, b) => ({...a, ...b}));
  }
  return v as EnumValues;
}

export interface EnumValues extends Record<string, string> {}

export namespace EnumValues {
  export type From<T> =
    T extends readonly string[] ? { [t in T[Extract<keyof T, number>]]: t; } :
    T extends Record<string, string> ? T :
    never;
}
export class EnumShape<T extends EnumValues = EnumValues, FQN extends string | undefined = string | undefined> extends Shape {
  public readonly Kind: 'enumShape' = 'enumShape';

  constructor(public readonly Values: T, public readonly FQN: FQN) {
    super();
  }
}
