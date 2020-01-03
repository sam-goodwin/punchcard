import { Member } from "./member";
import { Shape } from "./shape";

/**
 * The Shape AST.
 */
export type AST = Shape | Member;
export namespace AST {
  export function is<T extends AST>(label: T['NodeType']): (a: any) => a is T {
    return ((a: any) => (a.NodeType === label)) as any;
  }
}