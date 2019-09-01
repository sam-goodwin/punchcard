import { BinaryShape, RuntimeShape, Shape, StringShape, StructShape } from '../shape';
import { Query } from './client';
import { CompileContext } from './expression/compile-context';
import { CompileContextImpl } from './expression/compiler';
import { Table } from './table';

export interface CompiledQuery {
  KeyConditionExpression: string;
  FilterExpression?: string;
  ExpressionAttributeNames?: AWS.DynamoDB.ExpressionAttributeNameMap;
  ExpressionAttributeValues?: AWS.DynamoDB.ExpressionAttributeValueMap;
}

export function compileQuery<S extends StructShape<any>, PKey extends keyof S, SKey extends keyof S>(
  table: Table<PKey, SKey, S>, query: Query<S, PKey, SKey>): CompiledQuery {

  const context = new CompileContextImpl();
  const pName = context.name(table.partitionKey.toString());
  const pValue = context.value(table.shape.shape[table.partitionKey], query.key[table.partitionKey] as any);
  let keyConditionExpression: string = `${pName} = ${pValue}`;
  if ((query.key as any)[table.sortKey]) {
    // TODO: why not inferred?
    const keyComparison = (query.key as any)[table.sortKey] as any as Comparison<S['shape'][SKey]>;
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
export type KeyConditionExpression<S extends StructShape<any>, PKey extends keyof S, SKey extends keyof S> =
  { [K in PKey]: RuntimeShape<S['shape'][K]> } &
  { [K in SKey]?: SortKeyComparator<S, K> };

type SortKeyComparator<S extends StructShape<any>, K extends keyof S> =
  S[K] extends (StringShape | BinaryShape) ?
    StringComparators<S, K> :
    GeneralComparators<S, K>;

type GeneralComparators<S extends StructShape<any>, K extends keyof S> =
  Equals<S['shape'][K]> |
  GreaterThan<S['shape'][K]> |
  GreaterThanEqual<S['shape'][K]> |
  LessThan<S['shape'][K]> |
  LessThanEqual<S['shape'][K]> |
  Between<S['shape'][K]>;

type StringComparators<S extends StructShape<any>, K extends keyof S> =
  GeneralComparators<S, K> |
  BeginsWith<S['shape'][K]>;

interface Comparison<T extends StructShape<any>> {
  compile(name: string, type: T, context: CompileContext): string;
}

abstract class QueryOperand<T extends StructShape<any>> implements Comparison<T> {
  protected abstract readonly operand: string;

  constructor(private readonly value: RuntimeShape<T>) {}

  public compile(name: string, type: T, context: CompileContext): string {
    return `${context.name(name)} ${this.operand} ${context.value(type, this.value)}`;
  }
}

// Todo: anchor T
export function equals<T extends StructShape<any>>(value: RuntimeShape<T>): Equals<T> {
  return new Equals(value);
}

class Equals<T extends StructShape<any>> extends QueryOperand<T> {
  protected readonly operand = '=';
}

export function greaterThan<T extends StructShape<any>>(value: RuntimeShape<T>): GreaterThan<T> {
  return new GreaterThan(value);
}

class GreaterThan<T extends StructShape<any>> extends QueryOperand<T> {
  protected readonly operand = '>';
}

export function greaterThanEqual<T extends StructShape<any>>(value: RuntimeShape<T>): GreaterThanEqual<T> {
  return new GreaterThanEqual(value);
}

class GreaterThanEqual<T extends StructShape<any>> extends QueryOperand<T> {
  protected readonly operand = '>=';
}

export function lessThan<T extends StructShape<any>>(value: RuntimeShape<T>): LessThan<T> {
  return new LessThan(value);
}

class LessThan<T extends StructShape<any>> extends QueryOperand<T> {
  protected readonly operand = '<';
}

export function lessThanEqual<T extends StructShape<any>>(value: RuntimeShape<T>): LessThanEqual<T> {
  return new LessThanEqual(value);
}

class LessThanEqual<T extends StructShape<any>> extends QueryOperand<T> {
  protected readonly operand = '<=';
}

export function between<T extends StructShape<any>>(lower: RuntimeShape<T>, upper: RuntimeShape<T>): Between<T> {
  return new Between(lower, upper);
}

class Between<T extends StructShape<any>> implements Comparison<T> {
  constructor(private readonly lower: RuntimeShape<T>, private readonly upper: RuntimeShape<T>) {}

  public compile(name: string, type: T, context: CompileContext): string {
    return `${context.name(name)} BETWEEN ${context.value(type, this.lower)} AND ${context.value(type, this.upper)}`;
  }
}

export function beginsWith<T extends StructShape<any>>(prefix: RuntimeShape<T>): BeginsWith<T> {
  return new BeginsWith(prefix);
}

class BeginsWith<T extends StructShape<any>> implements Comparison<T> {
  constructor(private readonly prefix: RuntimeShape<T>) {}

  public compile(name: string, type: T, context: CompileContext): string {
    return `begins_with(${context.name(name)},${context.value(type, this.prefix)})`;
  }
}
