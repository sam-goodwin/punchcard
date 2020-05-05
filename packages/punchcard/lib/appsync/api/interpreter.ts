import { UnionShape } from '@punchcard/shape/lib/union';
import { VExpression } from '../lang/expression';
import { ElseBranch, IfBranch, isIfBranch, stash, write } from '../lang/statement';
import { VNothing, VObject, VUnion } from '../lang/vtl-object';

export const idFactory = () => {
  const inc: {
    [key: string]: number;
  } = {};

  return (prefix: string = 'var') => {
    const i = inc[prefix];
    if (i === undefined) {
      inc[prefix] = 0;
    }
    return `${prefix}${(inc[prefix] += 1).toString(10)}`;
  };
};

export function interpret(program: Generator): any {
  let next: IteratorResult<any, any>;
  while (!(next = program.next(undefined)).done) {
    next = program.next();
  }
  return next.value;
}

export interface InterpreterState {
  readonly indentSpaces: number;
  newId(prefix?: string): string;
}
export type InterpreterFactory = (state: InterpreterState) => Interpreter;
export type Interpreter = (stmt: any) => Generator<any, any, any>;

export function *interpretProgram(
  program: Generator<any, VObject | void>,
  interpreter: Interpreter,
  returnId?: string
): Generator<any, VObject | void, any> {
  let next: IteratorResult<any, any>;
  let returns: VObject | undefined;

  while (!(next = program.next(returns)).done) {
    const stmt = next.value;
    returns = yield* interpreter(stmt);
  }
  if (next.value !== undefined && returnId) {
    return yield* stash(next.value, {
      id: returnId
    });
  }

  return undefined;
}

export function *parseIf(
  branch: IfBranch<any>,
  state: InterpreterState,
  interpretFactory: InterpreterFactory
): Generator<any, readonly [string, any[]]> {
  const elseIfBranches: IfBranch<VObject | void>[] = [];
  let elseBranch: ElseBranch<VObject | void> | undefined;

  let b: IfBranch<VObject | void> | ElseBranch<VObject | void> | undefined = branch.elseBranch;
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

  const nextState: InterpreterState = {
    ...state,
    indentSpaces: state.indentSpaces + 2,
  };

  const branchYieldValues: any[] = [];

  yield* write(VExpression.concat('#if(', branch.condition, ')'));
  branchYieldValues.push(yield* interpretProgram(branch.then(), interpretFactory(nextState), returnId));
  // yield* parseBlock(branch.then(), localCallback, interpret);
  for (const elseIfBranch of elseIfBranches) {
    yield* write(VExpression.concat('#elseif(', elseIfBranch.condition, ')',));
    branchYieldValues.push(yield* interpretProgram(elseIfBranch.then(), interpretFactory(nextState), returnId));
  }
  if (elseBranch) {
    yield* write(VExpression.text('#{else}'));
    branchYieldValues.push(yield* interpretProgram(elseBranch.then(), interpretFactory(nextState), returnId));
  } else {
    branchYieldValues.push(undefined);
  }
  yield* write(VExpression.text('#end'));

  return [returnId, branchYieldValues] as const;
}
