import type * as iam from '@aws-cdk/aws-iam';

import { liftF } from 'fp-ts-contrib/lib/Free';

import { RecordShape, Shape } from '@punchcard/shape';
import { DDB } from '@punchcard/shape-dynamodb';
import { Statement, StatementF } from '../appsync/intepreter/statement';
import { GraphQL } from '../appsync/types';
import { Build } from '../core/build';
import { Table } from './table';

export type KeyGraphQLRepr<DataType extends RecordShape, K extends DDB.KeyOf<DataType>> = {
  [k in Extract<K[keyof K], string>]: GraphQL.TypeOf<DataType['Members'][k]>;
};

export const getDynamoDBItem = <DataType extends Shape.Like<RecordShape>, Key extends DDB.KeyOf<Shape.Resolve<DataType>>>(
  table: Table<DataType, Key>,
  input: KeyGraphQLRepr<Shape.Resolve<DataType>, Key>,
  role?: Build<iam.Role>
): StatementF<GraphQL.TypeOf<Shape.Resolve<DataType>>> => liftF(new DynamoDBGetItem<GraphQL.TypeOf<Shape.Resolve<DataType>>>(table as any, input, role));

export function isDynamoDBGetItem(a: any): a is DynamoDBGetItem<any> {
  return a._tag === 'InvokeLambda';
}

export class DynamoDBGetItem<A extends GraphQL.Type> {
  _URI: Statement.URI;
  _A: A;
  _tag: 'DynamoDBGetItem' = 'DynamoDBGetItem';

  constructor(
    public readonly table: Table<GraphQL.ShapeOf<A>, any>,
    public readonly input: any,
    public readonly role?: Build<iam.Role>) {}
}