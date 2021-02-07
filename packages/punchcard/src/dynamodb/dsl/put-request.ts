import { TypeShape } from '@punchcard/shape';
import { VTL } from '../../appsync/lang/vtl';
import { VNothing, VObject } from '../../appsync/lang/vtl-object';
import { DynamoDSL } from './dynamo-repr';

export type PutRequest<DataType extends TypeShape> = {
  item: VObject.Like<DataType>;
  condition?: (item: DynamoDSL.Repr<DataType>['M']) => VTL<void | VNothing>;
} & ThisType<DynamoDSL.Repr<DataType>['M']>;
