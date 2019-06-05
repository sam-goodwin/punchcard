import { Shape } from '../../../shape/shape';
import { Type } from '../../../shape/types/type';

import { Compilable, CompileContext, CompiledExpression } from './compile-context';

import { Tree, TreeFields } from '../../../tree';

// tslint:disable: no-shadowed-variable
// tslint:disable: max-line-length

export const operand = Symbol.for('dynamodb-operand');
export const update = Symbol.for('dynamodb-operand-update');
export const condition = Symbol.for('dynamodb-operand-condition');

export type InferDynamoPathType<T extends Type<any>> = ReturnType<T['toDynamoPath']>;

/**
 * Maps each attribute in a schema to a 'facade' attribute representing its path.
 * 
 * TODO: better name
 */
export type Facade<S extends Shape> = {
  [K in keyof S]: InferDynamoPathType<S[K]>;
};

export abstract class DynamoPath extends Tree<DynamoPath> {
  public compile(context: CompileContext): string {
    return this[TreeFields.parent]!.compile(context);
  }
}

export class RootParent extends DynamoPath {
  constructor(private readonly name: string) {
    super(null as any, name);
  }

  public compile(context: CompileContext): string {
    return context.name(this.name);
  }
}

export class MapKeyParent extends DynamoPath {
  constructor(parent: DynamoPath, private readonly key: string) {
    super(parent, key);
  }

  public compile(context: CompileContext): string {
    return `${this[TreeFields.parent]!.compile(context)}.${context.name(this.key)}`;
  }
}

export class IndexParent extends DynamoPath {
  constructor(parent: DynamoPath, private readonly index: number) {
    super(parent, index.toString());
  }

  public compile(context: CompileContext): string {
    return `${this[TreeFields.parent]!.compile(context)}[${this.index}]`;
  }
}

/**
 * Represents a path to an attribute within a Dynamo Item.
 */
export class BaseDynamoPath<T extends Type<V>, V> extends DynamoPath implements Operand<T, V> {
  public readonly [operand]: 'operand' = 'operand';

  constructor(parent: DynamoPath, name: string, public readonly type: T) {
    super(parent, name);
  }

  public isSet() {
    return attribute_exists(this);
  }

  public isNotSet() {
    return attribute_not_exists(this);
  }

  public eq(value: ConditionValue<T, V>): Equals<T, V> {
    return new Equals(this.type, this, value);
  }

  public equals(value: ConditionValue<T, V>): Equals<T, V> {
    return this.eq(value);
  }

  public ne(value: ConditionValue<T, V>): NotEquals<T, V> {
    return new NotEquals(this.type, this, value);
  }

  public notEquals(value: ConditionValue<T, V>): NotEquals<T, V> {
    return this.ne(value);
  }

  public set(value: UpdateValue<T, V>): SetAction<T, V> {
    return new SetAction(this, value);
  }
}

export class OrdPath<T extends Type<V>, V> extends BaseDynamoPath<T, V> {
  public gt(value: ConditionValue<T, V>): Gt<T, V> {
    return new Gt(this.type, this, value);
  }

  public greaterThan(value: ConditionValue<T, V>): Gt<T, V> {
    return this.gt(value);
  }

  public gte(value: ConditionValue<T, V>): Gte<T, V> {
    return new Gte(this.type, this, value);
  }

  public greaterThanOrEqual(value: ConditionValue<T, V>): Gte<T, V> {
    return this.gte(value);
  }

  public lt(value: ConditionValue<T, V>): Lt<T, V> {
    return new Lt(this.type, this, value);
  }

  public lessThan(value: ConditionValue<T, V>): Lt<T, V> {
    return this.lt(value);
  }

  public lte(value: ConditionValue<T, V>): Lte<T, V> {
    return new Lte(this.type, this, value);
  }

  public lessThanOrEqual(value: ConditionValue<T, V>): Lte<T, V> {
    return this.lte(value);
  }

  // TODO: Do all data types support an IN check? Documentation hints at no: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Condition.html
  // .. but they all support equality, so why not IN? Performance constraints?
  public in(...operands: Array<ConditionValue<T, V>>): In<T, V> {
    return new In(this.type, this, operands);
  }

  public between(lower: ConditionValue<T, V>, upper: ConditionValue<T, V>) {
    return new Between(this.type, this, lower, upper);
  }
}

/**
 * Creates a facade for a DynamoDB Shape.
 *
 * @param schema of the dynamodb item
 */
export function toFacade<S extends Shape>(schema: S): Facade<S> {
  const facade: any = {};
  for (const [name, value] of Object.entries(schema)) {
    facade[name] = value.toDynamoPath(new RootParent(name), name);
  }
  return facade;
}

/*
value ::=
  operand
  | operand '+' operand
  | operand '-' operand
 */
export type UpdateValue<T extends Type<V>, V> = V | UpdateOperand<T, V> | BaseDynamoPath<T, V>;

export type ConditionValue<T extends Type<V>, V> = V | ConditionOperand<T, V> | BaseDynamoPath<T, V>;

/*
operand ::=
  path | function
*/
export abstract class Operand<T extends Type<V>, V> implements Compilable {
  public readonly [operand]: 'operand' = 'operand';

  constructor(public readonly type: T) {}

  public abstract compile(context: CompileContext): string;
}

export interface UpdateOperand<_T extends Type<V>, V> {
  readonly [update]: 'update'
}

export interface ConditionOperand<_T extends Type<V>, V> {
  readonly [condition]: 'condition'
}

export function compileValue<T extends Type<V>, V>(type: T, value: V | Operand<T, V>, context: CompileContext): string {
  if ((value as any)[operand] === 'operand') {
    return ( value as Operand<any, any>).compile(context);
  } else {
    return context.value(type, value);
  }
}

export abstract class Condition implements Compilable {
  public render(context: CompileContext): CompiledExpression {
    const expression = this.compile(context);

    const result: CompiledExpression = {
      ConditionExpression: expression
    };
    if (Object.keys(context.names).length > 0) {
      result.ExpressionAttributeNames = context.names;
    }
    if (Object.keys(context.values).length > 0) {
      result.ExpressionAttributeValues = context.values;
    }
    return result;
  }

  public abstract compile(context: CompileContext): string;

  public and(...conditions: Condition[]): Condition {
    return new And([this, ...conditions]);
  }

  public or(...conditions: Condition[]): Condition {
    return new Or([this, ...conditions]);
  }
}

/*
condition-expression ::=
      operand comparator operand
    | operand BETWEEN operand AND operand
    | operand IN ( operand (',' operand (, ...) ))
    | function
    | condition AND condition
    | condition OR condition
    | NOT condition
    | ( condition )
*/
/*
comparator ::=
    =
    | <>
    | <
    | <=
    | >
    | >=
*/
/*
function ::=
    attribute_exists (path)
    | attribute_not_exists (path)
    | attribute_type (path, type)
    | begins_with (path, substr)
    | contains (path, operand)
    | size (path)
*/

/**
 * Comparators
 */

abstract class ComparisonOperator<T extends Type<V>, V> extends Condition {
  protected readonly abstract operator: string;

  constructor(private readonly type: T, private readonly lhs: ConditionValue<T, V>, private readonly rhs: ConditionValue<T, V>) {
    super();
  }

  public compile(context: CompileContext): string {
    const lhs = compileValue(this.type, this.lhs, context);
    const rhs = compileValue(this.type, this.rhs, context);

    return `${lhs} ${this.operator} ${rhs}`;
  }
}

export class Equals<T extends Type<V>, V> extends ComparisonOperator<T, V> {
  protected readonly operator: string = '=';
}

export class NotEquals<T extends Type<V>, V> extends ComparisonOperator<T, V> {
  protected readonly operator: string = '<>';
}

export class Gt<T extends Type<V>, V> extends ComparisonOperator<T, V> {
  protected readonly operator: string = '>';
}

export class Gte<T extends Type<V>, V> extends ComparisonOperator<T, V> {
  protected readonly operator: string = '>=';
}

export class Lt<T extends Type<V>, V> extends ComparisonOperator<T, V> {
  protected readonly operator: string = '<';
}

export class Lte<T extends Type<V>, V> extends ComparisonOperator<T, V> {
  protected readonly operator: string = '<=';
}

export class Between<T extends Type<V>, V> extends Condition {
  constructor(private readonly type: T, private readonly value: ConditionValue<T, V>,
              private readonly lower: ConditionValue<T, V>, private readonly upper: ConditionValue<T, V>) {
    super();
  }

  public compile(context: CompileContext): string {
    const value = compileValue(this.type, this.value, context);
    const lower = compileValue(this.type, this.lower, context);
    const upper = compileValue(this.type, this.upper, context);

    return `${value} BETWEEN ${lower} AND ${upper}`;
  }
}

export class In<T extends Type<V>, V> extends Condition {
  constructor(private readonly type: T, private readonly value: ConditionValue<T, V>, private readonly operands: Array<ConditionValue<T, V>>) {
    super();
  }

  public compile(context: CompileContext): string {
    const name = compileValue(this.type, this.value, context);
    const operands = this.operands.map(operand => compileValue(this.type, operand, context));

    return `${name} IN (${operands.join(',')})`;
  }
}

/**
 * Functions
 */
export function attribute_not_exists(attribute: DynamoPath): AttributeNotExists {
  return new AttributeNotExists(attribute);
}

export class AttributeNotExists extends Condition {
  constructor(private readonly attribute: DynamoPath) {
    super();
  }

  public compile(context: CompileContext): string {
    return `attribute_not_exists(${this.attribute.compile(context)})`;
  }
}

export function attribute_exists(attribute: DynamoPath): AttributeExists {
  return new AttributeExists(attribute);
}

export class AttributeExists extends Condition {
  constructor(private readonly attribute: DynamoPath) {
    super();
  }

  public compile(context: CompileContext): string {
    return `attribute_exists(${this.attribute.compile(context)})`;
  }
}

export class BeginsWith<T extends Type<V>, V> extends Condition {
  constructor(private readonly attribute: BaseDynamoPath<T, V>, private readonly substring: ConditionValue<T, V>) {
    super();
  }

  public compile(context: CompileContext): string {
    const path = this.attribute.compile(context);
    const value = compileValue(this.attribute.type, this.substring, context);
    return `begins_with(${path},${value})`;
  }
}

export class Contains<T extends Type<V>, V> extends Condition {
  constructor(private readonly path: DynamoPath, private readonly type: T, private readonly value: ConditionValue<T, V>) {
    super();
  }

  public compile(context: CompileContext): string {
    const name = this.path.compile(context);
    const value = compileValue(this.type, this.value, context);
    return `contains(${name},${value})`;
  }
}

/**
 * Logic
 */
export function and(...conditions: Condition[]): And {
  return new And(conditions);
}

export function or(...conditions: Condition[]): Or {
  return new Or(conditions);
}

export function not(condition: Condition): Not {
  return new Not(condition);
}

export abstract class LogicOperator extends Condition {
  protected abstract readonly operator: string;

  constructor(protected readonly conditions: Condition[]) {
    super();
  }

  public compile(context: CompileContext): string {
    return this.conditions.map(condition => condition.compile(context)).join(this.operator);
  }
}

export class And extends LogicOperator {
  protected readonly operator: string = ' AND ';

  public and(...conditions: Condition[]): Condition {
    return new And(this.conditions.concat(conditions));
  }
}

export class Or extends LogicOperator {
  protected readonly operator: string = ' OR ';

  public or(...conditions: Condition[]): Condition {
    return new Or(this.conditions.concat(conditions));
  }
}

export class Not extends Condition {
  constructor(private readonly condition: Condition) {
    super();
  }

  public compile(context: CompileContext): string {
    return `NOT ${this.condition.compile(context)}`;
  }
}

export function _(condition: Condition): Parenthesis {
  return new Parenthesis(condition);
}

export class Parenthesis extends Condition {
  constructor(private readonly condition: Condition) {
    super();
  }

  public compile(context: CompileContext): string {
    return `(${this.condition.compile(context)})`;
  }
}

/*
https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
*/

/*
  update-expression ::=
  [ SET action [, action] ... ]
  [ REMOVE action [, action] ...]
  [ ADD action [, action] ... ]
  [ DELETE action [, action] ...]
*/
export enum ActionType {
  ADD = 0,
  DELETE = 1,
  REMOVE = 2,
  SET = 3
}

export abstract class UpdateAction implements Compilable {
  constructor(public readonly type: ActionType) {}

  public abstract compile(context: CompileContext): string;
}

/*
set-action ::=
  path = value
*/
export class SetAction<T extends Type<V>, V> extends UpdateAction {
  constructor(private readonly path: BaseDynamoPath<T, V>, private readonly value: UpdateValue<T, V>) {
    super(ActionType.SET);
  }

  public compile(context: CompileContext): string {
    const name = this.path.compile(context);
    const value = compileValue(this.path.type, this.value, context);
    return `${name} = ${value}`;
  }
}

export function remove<T extends Type<V>, V>(path: BaseDynamoPath<T, V>): RemoveAction<T, V> {
  return new RemoveAction(path);
}

/*
remove-action ::=
  path
*/
export class RemoveAction<T extends Type<V>, V> extends UpdateAction {
  constructor(private readonly path: BaseDynamoPath<T, V>) {
    super(ActionType.REMOVE);
  }

  public compile(context: CompileContext): string {
    return this.path.compile(context);
  }
}

/*
add-action ::=
  path value
*/
export class AddAction<T extends Type<V>, V> extends UpdateAction {
  constructor(private readonly attribute: BaseDynamoPath<T, V>, private readonly value: V) {
    super(ActionType.ADD);
  }

  public compile(context: CompileContext): string {
    const path = this.attribute.compile(context);
    const value = context.value(this.attribute.type, this.value);
    return `${path} ${value}`;
  }
}

/*
 delete-action ::=
  path value
*/
export class DeleteAction<V> extends UpdateAction {
  constructor(private readonly path: BaseDynamoPath<Type<Set<V>>, Set<V>>, private readonly subset: Set<V>) {
    super(ActionType.DELETE);
  }

  public compile(context: CompileContext): string {
    const path = this.path.compile(context);
    const value = context.value(this.path.type, this.subset);
    return `${path} ${value}`;
  }
}

export class IfNotExists<T extends Type<V>, V> implements Compilable {
  constructor(private readonly path: BaseDynamoPath<T, V>, private readonly value: UpdateValue<T, V>) {}

  public compile(context: CompileContext): string {
    return `if_not_exists(${this.path.compile(context)}, ${compileValue(this.path.type, this.value, context)})`;
  }
}

export function list_append<T extends Type<V>, V>(type: Type<V[]>, lhs: UpdateValue<Type<V[]>, V[]>, rhs: UpdateValue<Type<V[]>, V[]>): ListAppend<T, V> {
  return new ListAppend(type, lhs, rhs);
}

export class ListAppend<T extends Type<V>, V> extends Operand<Type<V[]>, V[]> implements UpdateOperand<T, V> {
  public readonly [update]: 'update' = 'update';

  constructor(type: Type<V[]>, private readonly lhs: UpdateValue<Type<V[]>, V[]>, private readonly rhs: UpdateValue<Type<V[]>, V[]>) {
    super(type);
  }

  public compile(context: CompileContext): string {
    return `list_append(${compileValue(this.type, this.lhs, context)},${compileValue(this.type, this.rhs, context)})`;
  }
}

abstract class NumericComputation<T extends Type<V>, V> extends Operand<T, V> implements UpdateOperand<T, V> {
  public readonly [update]: 'update' = 'update';

  protected abstract readonly operator: string;

  constructor(type: T, private readonly lhs: UpdateValue<T, V>, private readonly rhs: UpdateValue<T, V>) {
    super(type);
  }

  public compile(context: CompileContext): string {
    return `${compileValue(this.type, this.lhs, context)} ${this.operator} ${compileValue(this.type, this.rhs, context)}`;
  }
}

export class Plus<T extends Type<V>, V> extends NumericComputation<T, V> {
  protected readonly operator: string = '+';
}

export class Minus<T extends Type<V>, V> extends NumericComputation<T, V> {
  protected readonly operator: string = '-';
}
