import { ClassShape, ClassType } from "./class";
import { Member } from "./member";
import { NumberShape, StringShape } from "./primitive";
import { Shape } from "./shape";

export interface Visitor {
  stringShape(shape: StringShape): unknown;
  numberShape(shape: NumberShape): unknown;

  classShape<T extends ClassShape<any>>(shape: T): unknown;
}
export namespace Visitor {
  /**
   * Transforms a Shape to a new AST.
   */
  export type Map<T, V extends Visitor> =
    T extends ClassType<any> ? _Map<ClassShape<T>, V> :
    T extends ClassShape<any> ? MapMembers<T, V> : ReturnType<V['classShape']>;

  type _Map<T extends Shape, V extends Visitor> =
    T extends ClassShape<any> ? MapMembers<T, V> : ReturnType<V[T['Kind']]>;

  export type MapMembers<T extends ClassShape<any>, V extends Visitor> = {
    [property in keyof T['Members']]:
      T['Members'][property] extends Member<infer S, any> ? Visitor.Map<S, V> :
      never;
  };
}

export function visit<V extends Visitor, S extends Shape>(ast: S, visitor: V): ReturnType<V[S['Kind']]> {
  return ast.visit(visitor);
}