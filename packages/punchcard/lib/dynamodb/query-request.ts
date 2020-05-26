import { DistributeUnionShape, NothingShape, PickRecord, RecordShape, UnionShape } from '@punchcard/shape';
import { DDB } from '@punchcard/shape-dynamodb';
import { VBool, VInteger, VList, VNothing, VObject, VString, VTL, VUnion } from '../appsync';
import { DynamoDSL } from './dsl/dynamo-repr';

export interface QueryRequest<DataType extends RecordShape, Key extends DDB.KeyOf<DataType>> {
  where: QueryCondition<DataType, Key>;
  nextToken?: string | VString | VNothing | VUnion<VString | VNothing>;
  limit?: number | VInteger | VNothing | VUnion<VInteger | VNothing>;
  scanIndexForward?: boolean | VBool | VUnion<VBool | VNothing>;
  consistentRead?: boolean | VBool | VUnion<VBool | VNothing>;
  filter?: (item: DynamoDSL.Repr<DataType>) => VTL<void>;
  select?: (keyof DataType['Members'])[] | ReadonlyArray<keyof DataType['Members']>
}

export type QueryCondition<DataType extends RecordShape, Key extends DDB.KeyOf<DataType>> = Key['sort'] extends string ? {
  [p in Key['partition']]: VObject.Of<Exclude<DistributeUnionShape<DataType['Members'][p]>, UnionShape<any> | NothingShape>>
} & {
  [s in Key['sort']]?: (s: DynamoDSL.Repr<DataType['Members'][s]>) => DynamoDSL.Bool
} : never;

export type QueryResponse<
  Request extends QueryRequest<DataType, Key>,
  DataType extends RecordShape,
  Key extends DDB.KeyOf<DataType>
> = {
  items: VList<Request['select'] extends (keyof DataType['Members'])[] | ReadonlyArray<keyof DataType['Members']> ?
    VObject.Of<PickRecord<
      DataType['Members'],
      undefined,
      Request['select']
    >> :
    VObject.Of<DataType>
  >;
  scannedCount: VInteger;
  nextToken: VUnion<VString | VNothing>;
};