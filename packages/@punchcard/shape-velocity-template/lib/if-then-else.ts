import { Object } from "./object";
import { Bool } from "./primitive";

export class IfThen {
  constructor(
    public readonly condition: Bool,
    public readonly then: () => void,
    public readonly elseThen?: IfThen | ElseThen) {}
}
export class ElseThen {
  constructor(public readonly then: () => void) {}
}

export function If(condition: Bool, then: () => void, elseThen?: IfThen | ElseThen): IfThen {
  return new IfThen(condition, then, elseThen);
}

export const ElseIf = If;

export function Else(then: () => void): ElseThen {
  return new ElseThen(then);
}

