import { RecordShape } from '@punchcard/shape';
import { DDB } from '@punchcard/shape-dynamodb';
import { KeyGraphQLRepr } from '../table';
import { DynamoDSL } from './dynamo-repr';
import { UpdateTransaction } from './update-statement';

export type UpdateRequest<DataType extends RecordShape, Key extends DDB.KeyOf<DataType>> = {
  key: KeyGraphQLRepr<DataType, Key>;
  actions: (item: DynamoDSL.Repr<DataType>['M']) => UpdateTransaction<void>;
  if?: (item: DynamoDSL.Repr<DataType>['M']) => DynamoDSL.Bool;
} & ThisType<DynamoDSL.Repr<DataType>['M']>;
