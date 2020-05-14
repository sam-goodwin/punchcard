import { Shape } from '@punchcard/shape';
import { getState, VObject, VObjectExpr, vtl, VTL } from '../../appsync';
import { $util } from '../../appsync/lang/util';
import { DynamoExpr } from './dynamo-expr';
import { DynamoGuards } from './guards';

/**
 * Traverses the DDB expression, writes values to the expression
 * attribute names and returns a string representing the path
 * to the attribute.
 */
export function *toPath(expr: DynamoExpr): Generator<any, string> {
  const state = yield* getState();
  if (DynamoExpr.isLiteral(expr)) {
    return yield* addValue(expr.type, expr.value);
  } else if (DynamoExpr.isReference(expr)) {
    const prev = expr.target ? `${(yield* toPath(expr.target.expr))}.` : '';
    const id = state.newId('#');
    yield* vtl`$util.qr($expressionNames.put("${id}", "${expr.id}"))`;
    return `${prev}${id}`;
  } else if (DynamoExpr.isGetListItem(expr)) {
    const prev = yield* toPath(expr.list.expr);
    const index = typeof expr.index === 'number' ?
      expr.index :
      expr.index[VObjectExpr].visit(state)
    ;
    return `${prev}[${index}]`;
  } else if (DynamoExpr.isGetMapItem(expr)) {
    const prev = yield* toPath(expr.map.expr);
    const key = typeof expr.key === 'string' ?
      `"${expr.key}"` :
      expr.key[VObjectExpr].visit(state) as string // todo: visit doesn't always return a string
    ;
    const id = state.newId('#');
    yield* vtl`$util.qr($expressionNames.put("${id}", ${key}))`;
    return `${prev}.${id}`;
  } else if (DynamoExpr.isFunctionCall(expr)) {
    const args: string[] = [];
    for (const {type, value} of expr.args) {
      if (DynamoGuards.isObject(value)) {
        args.push(yield* toPath(value.expr));
      } else {
        args.push(yield* addValue(type, value));
      }
    }
    return `${expr.functionName}(${args.join(',')})`;
  }
  // TODO: the rest
  console.error('unknown expr', expr);
  throw new Error(`unknown expr`);
}

// adds a value to the expression values
export function *addValue<T extends Shape>(type: T, value: VObject.Like<T>): VTL<string> {
  const state = yield* getState();
  const setValue = yield* $util.dynamodb.toDynamoDBExtended(type, value);
  const valueId = state.newId(':');
  yield* vtl`$util.qr($expressionValues.put("${valueId}", ${setValue}))`;
  return valueId;
}