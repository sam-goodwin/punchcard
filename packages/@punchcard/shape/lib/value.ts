export namespace Value {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-runtime.Value.Tag');

  export type Of<T> =
    /**
     * Use the Tagged value if it exists (usually for a Shape)
     */
    T extends {[Tag]: infer T2} ? T2 :
    /**
     * Otherwise use the instance value (usually for a Record)
     */
    T extends new(v: any) => infer T2 ? T2 :

    never;
}
