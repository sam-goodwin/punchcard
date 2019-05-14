import { BinaryType, RuntimeType, Shape, StringType, Type } from '../shape';
import { Query } from './client';
import { CompileContext } from './expression/compile-context';
import { CompileContextImpl } from './expression/compiler';
import { SortedTable } from './table';

export interface CompiledQuery {
  KeyConditionExpression: string;
  FilterExpression?: string;
  ExpressionAttributeNames?: AWS.DynamoDB.ExpressionAttributeNameMap;
  ExpressionAttributeValues?: AWS.DynamoDB.ExpressionAttributeValueMap;
}

export function compileQuery<T extends Shape, PKey extends keyof T, SKey extends keyof T>(
  table: SortedTable<T, PKey, SKey>, query: Query<T, PKey, SKey>): CompiledQuery {

  const context = new CompileContextImpl();
  const pName = context.name(table.partitionKey.toString());
  const pValue = context.value(table.shape[table.partitionKey], query.key[table.partitionKey]);
  let keyConditionExpression: string = `${pName} = ${pValue}`;
  if (query.key[table.sortKey]) {
    // TODO: why not inferred?
    const keyComparison = query.key[table.sortKey] as any as Comparison<T[SKey], RuntimeType<T[SKey]>>;
    keyConditionExpression += ` AND ${(keyComparison.compile(table.sortKey.toString(), table.shape[table.sortKey], context))}`;
  }

  return {
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeNames: context.names,
    ExpressionAttributeValues: context.values,
    FilterExpression: query.filter ? query.filter(table.facade).compile(context) : undefined
  };
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
  Equals<S[K], RuntimeType<S[K]>> |
  GreaterThan<S[K], RuntimeType<S[K]>> |
  GreaterThanEqual<S[K], RuntimeType<S[K]>> |
  LessThan<S[K], RuntimeType<S[K]>> |
  LessThanEqual<S[K], RuntimeType<S[K]>> |
  Between<S[K], RuntimeType<S[K]>>;

type StringComparators<S extends Shape, K extends keyof S> =
  GeneralComparators<S, K> |
  BeginsWith<S[K], RuntimeType<S[K]>>;

interface Comparison<T extends Type<V>, V> {
  compile(name: string, type: T, context: CompileContext): string;
}

abstract class QueryOperand<T extends Type<V>, V> implements Comparison<T, V> {
  protected abstract readonly operand: string;

  constructor(private readonly value: V) {}

  public compile(name: string, type: T, context: CompileContext): string {
    return `${context.name(name)} ${this.operand} ${context.value(type, this.value)}`;
  }
}

// Todo: anchor T
export function equals<T extends Type<V>, V>(value: V): Equals<T, V> {
  return new Equals(value);
}

class Equals<T extends Type<V>, V> extends QueryOperand<T, V> {
  protected readonly operand = '=';
}

export function greaterThan<T extends Type<V>, V>(value: V): GreaterThan<T, V> {
  return new GreaterThan(value);
}

class GreaterThan<T extends Type<V>, V> extends QueryOperand<T, V> {
  protected readonly operand = '>';
}

export function greaterThanEqual<T extends Type<V>, V>(value: V): GreaterThanEqual<T, V> {
  return new GreaterThanEqual(value);
}

class GreaterThanEqual<T extends Type<V>, V> extends QueryOperand<T, V> {
  protected readonly operand = '>=';
}

export function lessThan<T extends Type<V>, V>(value: V): LessThan<T, V> {
  return new LessThan(value);
}

class LessThan<T extends Type<V>, V> extends QueryOperand<T, V> {
  protected readonly operand = '<';
}

export function lessThanEqual<T extends Type<V>, V>(value: V): LessThanEqual<T, V> {
  return new LessThanEqual(value);
}

class LessThanEqual<T extends Type<V>, V> extends QueryOperand<T, V> {
  protected readonly operand = '<=';
}

export function between<T extends Type<V>, V>(lower: V, upper: V): Between<T, V> {
  return new Between(lower, upper);
}

class Between<T extends Type<V>, V> implements Comparison<T, V> {
  constructor(private readonly lower: V, private readonly upper: V) {}

  public compile(name: string, type: T, context: CompileContext): string {
    return `${context.name(name)} BETWEEN ${context.value(type, this.lower)} AND ${context.value(type, this.upper)}`;
  }
}

export function beginsWith<T extends Type<V>, V>(prefix: V): BeginsWith<T, V> {
  return new BeginsWith(prefix);
}

class BeginsWith<T extends Type<V>, V> implements Comparison<T, V> {
  constructor(private readonly prefix: V) {}

  public compile(name: string, type: T, context: CompileContext): string {
    return `begins_with(${context.name(name)},${context.value(type, this.prefix)})`;
  }
}
