import { RecordShape } from '@punchcard/shape';
import { DDB } from '@punchcard/shape-dynamodb';
import { KeyGraphQLRepr } from '../table';
import { ConditionExpression } from './condition-expression';
import { DynamoDSL } from './dynamo-repr';
import { UpdateTransaction } from './update-transaction';

export type UpdateRequest<DataType extends RecordShape, Key extends DDB.KeyOf<DataType>> = {
  key: KeyGraphQLRepr<DataType, Key>;
  transaction: (item: DynamoDSL.Repr<DataType>['M']) => UpdateTransaction<void>;
  condition?: (item: DynamoDSL.Repr<DataType>['M']) => ConditionExpression<DynamoDSL.Bool>;
} & ThisType<DynamoDSL.Repr<DataType>['M']>;
