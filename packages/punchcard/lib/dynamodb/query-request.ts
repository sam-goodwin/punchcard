import { any, array, boolean, DistributeUnionShape, integer, map, NothingShape, optional, Pick, PickRecord, string, Type, TypeShape, UnionShape } from '@punchcard/shape';
import { DDB } from '@punchcard/shape-dynamodb';
import { call, DataSourceBindCallback, VBool, VExpression, VInteger, VList, VNothing, VObject, VString, VTL, vtl, VUnion } from '../appsync';
import { Build } from '../core/build';
import { DynamoExpr } from './dsl/dynamo-expr';
import { DynamoDSL } from './dsl/dynamo-repr';

export interface QueryRequest<DataType extends TypeShape, Key extends DDB.KeyOf<DataType>> {
  where: QueryCondition<DataType, Key>;
  nextToken?: string | VString | VNothing | VUnion<VString | VNothing>;
  limit?: number | VInteger | VNothing | VUnion<VInteger | VNothing>;
  scanIndexForward?: boolean | VBool | VUnion<VBool | VNothing>;
  consistentRead?: boolean | VBool | VUnion<VBool | VNothing>;
  filter?: (item: DynamoDSL.Repr<DataType>) => VTL<void>;
  select?: (keyof DataType['Members'])[] | ReadonlyArray<keyof DataType['Members']>
}

export type QueryCondition<DataType extends TypeShape, Key extends DDB.KeyOf<DataType>> = Key['sort'] extends string ? {
  [p in Key['partition']]: VObject.Like<Exclude<DistributeUnionShape<DataType['Members'][p]>, UnionShape<any> | NothingShape>>
} & {
  [s in Key['sort']]?: (s: DynamoDSL.Repr<DataType['Members'][s]>) => DynamoDSL.Bool
} : never;

export function QueryResponse<T extends TypeShape>(type: T) {
  return Type({
    items: array(type),
    nextToken: optional(string),
    scannedCount: integer
  });
}
export type QueryResponse<
  Request extends QueryRequest<DataType, Key>,
  DataType extends TypeShape,
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

export function *query<DataType extends TypeShape, Key extends DDB.KeyOf<DataType>>(props: {
  dataType: DataType,
  keyShape: TypeShape,
  key: Key,
  request: QueryRequest<any, any>,
  indexName?: string,
  dataSourceProps: Build<DataSourceBindCallback>
}) {
  // map of id -> attribute-value
  const expressionValues = yield* vtl(map(any), {
    local: true,
    id: '$VALUES'
  })`{}`;

  // map of name -> id
  const expressionNames = yield* vtl(map(string), {
    local: true,
    id: '$NAMES'
  })`{}`;

  const expression = yield* vtl(string, {
    local: true,
    id: '$EXPRESSION'
  })``;

  if (typeof props.key.sort === 'string') {
    const sortCondition = (props.request.where as any)[props.key.sort];
    if (typeof sortCondition === 'function') {
      const sortKeyShape = (props.keyShape.Members as any)[props.key.sort];
      const sortKey = DynamoDSL.of(sortKeyShape, new DynamoExpr.Reference(undefined, sortKeyShape, props.key.sort as string));
      const condition: DynamoDSL.Bool = sortCondition(sortKey);

      yield* DynamoDSL.expect(condition);
    }
  }

  const Filter = Type({
    expression: string,
    expressionNames: map(string),
    expressionValues: map(any)
  });
  const QueryRequest = Type({
    version: string,
    operation: string,
    key: props.keyShape,
    query: Type({
      expression: string,
      expressionNames: map(string),
      expressionValues: map(any)
    }),
    index: optional(string),
    nextToken: optional(string),
    limit: integer,
    scanIndexForward: boolean,
    consistentRead: boolean,
    select: string,
    filter: optional(Filter)
  });

  const queryRequest = VObject.fromExpr(QueryRequest, VExpression.json({
    version: '2017-02-28',
    operation: 'Query',
    query: {
      expression,
      expressionNames,
      expressionValues
    },
    nextToken: props.request.nextToken,
    limit: props.request.limit || 10,
    scanIndexForward: props.request.scanIndexForward,
    select: Array.isArray(props.request.select) ? 'ALL_PROJECTED_ATTRIBUTES' : 'ALL_ATTRIBUTES',
    filter: undefined // todo
  }));

  return yield* call(
    props.dataSourceProps,
    queryRequest,
    QueryResponse(Array.isArray(props.request.select) ? props.dataType : Pick(props.dataType, undefined, props.request.select as string[]))
  ) as any;
}