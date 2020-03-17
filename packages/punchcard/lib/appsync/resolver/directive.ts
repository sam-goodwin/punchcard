import { liftF } from "fp-ts-contrib/lib/Free";
import { URI } from "./resolver";

export const directive = <A>(input: string) => liftF(new Directive<A>(input));

export function isDirective(a: any): a is Directive<any> {
  return a._tag === 'Directive';
}

export class Directive<A> {
  _URI: URI;
  _A: A;
  _tag: 'Directive' = 'Directive';

  constructor(public readonly directive: string) {}
}
