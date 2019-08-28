import { BinaryType, RuntimeType, Shape, StringType, Type } from '../shape';
import { CompileContext } from './expression/compile-context';
import { CompileContextImpl } from './expression/compiler';
import { Query, Table } from './table';

export interface CompiledQuery {
  KeyConditionExpression: string;
  FilterExpression?: string;
  ExpressionAttributeNames?: AWS.DynamoDB.ExpressionAttributeNameMap;
  ExpressionAttributeValues?: AWS.DynamoDB.ExpressionAttributeValueMap;
}

export function compileQuery<S extends Shape, PKey extends keyof S, SKey extends keyof S>(
  table: Table<PKey, SKey, S>, query: Query<S, PKey, SKey>): CompiledQuery {

  const context = new CompileContextImpl();
  const pName = context.name(table.partitionKey.toString());
  const pValue = context.value(table.shape[table.partitionKey], query.key[table.partitionKey] as any);
  let keyConditionExpression: string = `${pName} = ${pValue}`;
  if ((query.key as any)[table.sortKey]) {
    // TODO: why not inferred?
    const keyComparison = (query.key as any)[table.sortKey] as any as Comparison<S[SKey]>;
    keyConditionExpression += ` AND ${(keyComparison.compile(table.sortKey.toString(), table.shape[table.sortKey], context))}`;
  }

  const q = {
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeNames: context.names,
    ExpressionAttributeValues: context.values,
    FilterExpression: query.filter ? query.filter(table.facade).compile(context) : undefined
  };
  if (q.FilterExpression === undefined) {
    delete q.FilterExpression;
  }
  return q;
}

/**
 * https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html#DDB-Query-request-KeyConditionExpression
 */
export type KeyConditionExpression<S extends Shape, PKey extends keyof S, SKey extends keyof S> =
  { [K in PKey]: RuntimeType<S[K]> } &
  { [K in SKey]?: SortKeyComparator<S, K> };

type SortKeyComparator<S extends Shape, K extends keyof S> =
  S[K] extends (StringType | BinaryType) ?
    StringComparators<S, K> :
    GeneralComparators<S, K>;

type GeneralComparators<S extends Shape, K extends keyof S> =
  Equals<S[K]> |
  GreaterThan<S[K]> |
  GreaterThanEqual<S[K]> |
  LessThan<S[K]> |
  LessThanEqual<S[K]> |
  Between<S[K]>;

type StringComparators<S extends Shape, K extends keyof S> =
  GeneralComparators<S, K> |
  BeginsWith<S[K]>;

interface Comparison<T extends Type<any>> {
  compile(name: string, type: T, context: CompileContext): string;
}

abstract class QueryOperand<T extends Type<any>> implements Comparison<T> {
  protected abstract readonly operand: string;

  constructor(private readonly value: RuntimeType<T>) {}

  public compile(name: string, type: T, context: CompileContext): string {
    return `${context.name(name)} ${this.operand} ${context.value(type, this.value)}`;
  }
}

// Todo: anchor T
export function equals<T extends Type<any>>(value: RuntimeType<T>): Equals<T> {
  return new Equals(value);
}

class Equals<T extends Type<any>> extends QueryOperand<T> {
  protected readonly operand = '=';
}

export function greaterThan<T extends Type<any>>(value: RuntimeType<T>): GreaterThan<T> {
  return new GreaterThan(value);
}

class GreaterThan<T extends Type<any>> extends QueryOperand<T> {
  protected readonly operand = '>';
}

export function greaterThanEqual<T extends Type<any>>(value: RuntimeType<T>): GreaterThanEqual<T> {
  return new GreaterThanEqual(value);
}

class GreaterThanEqual<T extends Type<any>> extends QueryOperand<T> {
  protected readonly operand = '>=';
}

export function lessThan<T extends Type<any>>(value: RuntimeType<T>): LessThan<T> {
  return new LessThan(value);
}

class LessThan<T extends Type<any>> extends QueryOperand<T> {
  protected readonly operand = '<';
}

export function lessThanEqual<T extends Type<any>>(value: RuntimeType<T>): LessThanEqual<T> {
  return new LessThanEqual(value);
}

class LessThanEqual<T extends Type<any>> extends QueryOperand<T> {
  protected readonly operand = '<=';
}

export function between<T extends Type<any>>(lower: RuntimeType<T>, upper: RuntimeType<T>): Between<T> {
  return new Between(lower, upper);
}

class Between<T extends Type<any>> implements Comparison<T> {
  constructor(private readonly lower: RuntimeType<T>, private readonly upper: RuntimeType<T>) {}

  public compile(name: string, type: T, context: CompileContext): string {
    return `${context.name(name)} BETWEEN ${context.value(type, this.lower)} AND ${context.value(type, this.upper)}`;
  }
}

export function beginsWith<T extends Type<any>>(prefix: RuntimeType<T>): BeginsWith<T> {
  return new BeginsWith(prefix);
}

class BeginsWith<T extends Type<any>> implements Comparison<T> {
  constructor(private readonly prefix: RuntimeType<T>) {}

  public compile(name: string, type: T, context: CompileContext): string {
    return `begins_with(${context.name(name)},${context.value(type, this.prefix)})`;
  }
}
