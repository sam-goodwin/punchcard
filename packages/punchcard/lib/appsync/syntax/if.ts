import { VBool, VNothing } from '../types';
import { VObject } from '../types/object';
import { VTL } from '../types/vtl';
import { VExpression } from './expression';

export function $if(condition: VBool, then: () => VTL<VObject>): VTL<VNothing>;
export function $if<T extends VObject>(condition: VBool, then: () => VTL<T>, Else: If<T>): VTL<T>;

export function $if<T extends VObject>(condition: VBool, then: () => VTL<T>, Else?: If<T>): VTL<any> {
  
  return new If(condition, then, Else);
}


export function $elseIf(condition: VBool, then: () => VTL<VObject>): If<VNothing>;
export function $elseIf<T extends VObject>(condition: VBool, then: () => VTL<T>, Else: If<T>): If<T>;

export function $elseIf(condition: VBool, then: () => VTL<VObject>, Else?: If<VObject>): If<VObject> {
  return new If(condition, then, Else);

}

export function $else<T extends VObject>(then: () => VTL<T>): If<T> {
  const t = this.then();
  return VTL.clone(t, new VExpression(frame => {
    frame.print('#if(');
    const chain = this.chain();
    chain.forEach((c, i) => {
      frame.interpret(c.condition);
      frame.print(')');
      frame.indent();
      frame.printLine();
      // interpret the block
      frame.interpret(c.then());
      frame.unindent();
      frame.printLine();
      if (i < chain.length - 1) {
        frame.print('#elseif(');
      }
    });
    frame.print('#{else}');
    frame.indent();
    frame.printLine();

    frame.interpret(then());

    frame.unindent();
    frame.printLine();
    frame.print('#end');
  }));
}

export class If<T extends VObject> {
  constructor(
    public readonly condition: VBool,
    public readonly then?: () => VTL<T>,
    public readonly elseBranch?: If<T>
  ) {}

  // public $elseIf(condition: VBool, then: () => T): If<T> {
  //   return new If(this, condition, then);
  // }

  // private chain(): If<any>[] {
  //   const chain: If<any>[] = [this];
  //   let p = this.parent;
  //   while (p !== undefined) {
  //     chain.push(p);
  //     p = p.parent;
  //   }
  //   return chain.reverse();
  // }
}
