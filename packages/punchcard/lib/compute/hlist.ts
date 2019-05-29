// https://stackoverflow.com/questions/54243565/typescript-how-to-achieve-a-recursion-in-this-type
// https://github.com/Microsoft/TypeScript/issues/25947#issuecomment-446916897

export type Head<T> = T extends [infer U, ...unknown[]] ? U : never;

export type Tail<T> = T extends any[]
  ? ((...args: T) => never) extends ((a: any, ...args: infer R) => never)
    ? R
    : never
  : never;

export type Cons<T extends any[], H> = ((h: H, ...t: T) => any) extends ((...x: infer X) => any) ? X : never;

export type HList<T extends any[]> = Cons<Tail<T>, Head<T>>;

export function list<T extends any[]>(...values: T): HList<T> {
  return Array.from(values) as HList<T>;
}
export function cons<T extends any[], H>(head: H, tail: T): Cons<T, H> {
  return [head].concat(tail) as Cons<T, H>;
}
