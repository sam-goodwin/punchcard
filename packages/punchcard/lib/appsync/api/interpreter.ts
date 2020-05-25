import { VExpression } from '../lang/expression';
import { ElseBranch, IfBranch, isIfBranch, stash, Writable, write } from '../lang/statement';
import { $util } from '../lang/util';
import { VNever, VObject } from '../lang/vtl-object';

export type Interpreter = (stmt: any, state: InterpreterState) => any;

export function isInterpreterState(a: any): a is InterpreterState {
  return typeof a?.renderTemplate === 'function';
}
export class InterpreterState {
  constructor(
    public readonly template: string[] = [],
    public indentSpaces: number = 0,
    public readonly newId: (prefix?: string) => string = idGenerator()
  ) {}

  public renderTemplate(clear: boolean = true): string {
    const templateText = this.template.join('');
    if (clear) {
      this.clearTemplate();
    }
    return templateText || '{}';
  }

  public clearTemplate(): void {
    this.template.splice(0, this.template.length);
  }

  public writeLine(): InterpreterState {
    this.write('\n');
    for (let i = 0; i < this.indentSpaces; i++) {
      this.write(' ');
    }
    return this;
  }

  public write(...expressions: Writable[]): InterpreterState {
    // console.log(expressions);
    let state: InterpreterState = this;
    expressions.forEach(write);
    return state;

    function write(expr: Writable) {
      if (typeof expr === 'string') {
        state.template.push(expr);
      } else if (typeof expr === 'number') {
        state.write(expr.toString(10));
      } else if (typeof expr === 'boolean') {
        state.write(`${expr}`);
      } else if (VObject.isObject(expr)) {
        state.write(VObject.getExpr(expr));
      } else {
        // console.log(expr);
        const t = expr.visit(state);
        if (typeof t === 'string') {
          state.write(t);
        } else if (isInterpreterState(t)) {
          state = t;
        }
      }
    }
  }

  public stash(value: VObject, props?: {
    id?: string;
    local?: boolean;
  }): string {
    const id = props?.id || `$${props?.local ? '': 'context.stash.'}${this.newId()}`;

    this.write(`#set(${id} = `, value, ')').writeLine();
    return id;
  }

  public indent(): InterpreterState {
    this.indentSpaces += 2;
    return this;
  }

  public unindent(): InterpreterState {
    this.indentSpaces -= 2;
    if(this.indentSpaces < 0) {
      this.indentSpaces = 0;
    }
    return this;
  }
}

export function idGenerator() {
  const idNamespaces: {
    [key: string]: number
  } = {};

  return (prefix: string = 'var') => {
    const i = idNamespaces[prefix];
    if (i === undefined) {
      idNamespaces[prefix] = 0;
    }
    return `${prefix}${(idNamespaces[prefix] += 1).toString(10)}`;
  };
}

export function interpretProgram(
  program: Generator<any, VObject | void>,
  state: InterpreterState,
  interpreter: Interpreter,
): VObject | void {
  let next: IteratorResult<any, any>;
  let returns: VObject | undefined;

  while (true) {
    try {
      next = program.next(returns);
      if (!next.done) {
        const stmt = next.value;
        returns = interpreter(stmt, state);
      } else {
        return next.value;
      }
    } catch (err) {
      // if we receive an error, write that error to VTL (don't propagate).
      if (VObject.isObject(err)) {
        state.write(err);
      } else {
        throw err;
      }
      return undefined;
    }
  }
}

export function parseIf(
  ifBranch: IfBranch<any>,
  state: InterpreterState,
  interpreter: Interpreter
): readonly [string, any[]] {
  const elseIfBranches: IfBranch<VObject | void>[] = [];
  let elseBranch: ElseBranch<VObject | void> | undefined;

  let b: IfBranch<VObject | void> | ElseBranch<VObject | void> | undefined = ifBranch.elseBranch;
  while (b !== undefined) {
    if (isIfBranch(b)) {
      elseIfBranches.push(b);
      b = b.elseBranch!;
    } else {
      elseBranch = b;
      break;
    }
  }

  const returnId = `$${state.newId('local')}`;
  const branchYieldValues: any[] = [];

  let firstIf = true; // track whether this is an if or an elseIf
  visitBranch(ifBranch);
  for (const elseIfBranch of elseIfBranches) {
    visitBranch(elseIfBranch);
  }
  if (elseBranch) {
    visitBranch(elseBranch);
  } else {
    branchYieldValues.push(undefined);
  }
  state.write('#end').writeLine();

  // visits a branch and returns the value by setting the outer returnId
  function visitBranch(branch: IfBranch | ElseBranch) {
    if(isIfBranch(branch)) {
      state.write(firstIf ? `#if` : '#elseif', '(', branch.condition, ')');
      firstIf = false;
    } else {
      state.write('#{else}');
    }
    state.indent().writeLine();
    const value = interpretProgram(branch.then(), state, interpreter);
    if (value) {
      try {
        state.stash(value, {
          id: returnId
        });
      } catch (err) {
        console.log(branch);
        throw err;
      }
    }
    state.unindent().writeLine();
    branchYieldValues.push(value);
  }

  return [returnId, branchYieldValues] as const;
}
