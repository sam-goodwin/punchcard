import { RecordShape } from '@punchcard/shape';
import { DDB } from '@punchcard/shape-dynamodb';
import { VTL } from '../../appsync/lang/vtl';
import { KeyGraphQLRepr } from '../table';
import { ConditionExpression } from './condition-expression';
import { DynamoDSL } from './dynamo-repr';

export type UpdateRequest<DataType extends RecordShape, Key extends DDB.KeyOf<DataType>> = {
  key: KeyGraphQLRepr<DataType, Key>;
  transaction: (item: DynamoDSL.Repr<DataType>['M']) => VTL<void>;
  condition?: (item: DynamoDSL.Repr<DataType>['M']) => ConditionExpression<DynamoDSL.Bool>;
} & ThisType<DynamoDSL.Repr<DataType>['M']>;
