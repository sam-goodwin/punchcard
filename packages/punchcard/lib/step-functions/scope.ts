import { Node } from './node';
import { Statement } from './statement';
import { Thread } from './thread';

export interface LexicalScope {
  [id: string]: any;
}

export class Scope extends Node {
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

  public get thread(): Thread {
    if (!this.parent) {
      throw new Error(`frame had no thread`);
    }
    return this.parent.thread;
  }

  public newId(): string {
    this.counter += 1;
    return this.counter.toString();
  }

  public block(block: (frame: Scope) => any) {
    const frame = this.push();
    block(frame);
    frame.pop();
  }

  public push(): Scope {
    return new Scope(this);
  }

  public pop(): Scope | undefined {
    return this.parent;
  }

  public add(value: any): string {
    const id = this.thread.newId();
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