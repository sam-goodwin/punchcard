import { Node } from './node';
import { Statement } from './statement';

export interface LexicalScope {
  [id: string]: any;
}

export const IsScope = Symbol.for('punchcard.Scope');

export function isScope(a: any): a is Scope {
  return a !== undefined && a[IsScope] === true;
}

export class Scope extends Node {
  public static set(scope: Scope | undefined): void {
    const glob = global as any;
    glob[IsScope] = scope;
  }

  public static push(): Scope {
    const curr = Scope.get();
    const next = new Scope(curr);
    Scope.set(next);
    return next;
  }

  public static pop(): Scope | undefined {
    const curr = Scope.get();
    const parent = curr.parent;
    Scope.set(parent);
    return parent;
  }

  public static get(): Scope {
    const glob = global as any;
    if (isScope(glob[IsScope])) {
      return glob[IsScope];
    }
    throw new Error(`global scope is undefined`);
  }

  public static block<T>(f: (scope: Scope) => T): T {
    const scope = Scope.push();
    const ret = f(scope);
    Scope.pop();
    return ret;
  }

  public readonly [IsScope]: true = true;

  public readonly children: Scope[] = [];
  public readonly lexicalScope: LexicalScope = {};
  public readonly statements: Statement[];

  public readonly kind: 'scope' = 'scope';

  private counter = -1;

  constructor(public readonly parent?: Scope) {
    super();
    if (parent) {
      parent.children.push(this);
    }
  }

  public addStatement(statement: Statement): void {
    this.statements.push(statement);
  }

  public newId(): string {
    this.counter += 1;
    return this.counter.toString();
  }

  public add(value: any): string {
    const id = this.newId();
    this.set(id, value);
    return id;
  }

  public set(id: string, value: any): void {
    this.lexicalScope[id] = value;
  }

  public get(id: string): any | undefined {
    if (this.lexicalScope[id] !== undefined) {
      return this.lexicalScope[id];
    }
    if (this.parent) {
      return this.parent.get(id);
    }
    return undefined;
  }
}