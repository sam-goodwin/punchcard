import { ArrayShape, Fields, FunctionShape, PrimitiveShapes, RecordShape, Shape, UnionShape, Value } from '@punchcard/shape';
import { Api } from './api';

export namespace ApiClient {
  export type result = typeof result;
  export const result = Symbol.for('result');
}

// merge adhoc fields into a single view of all fields on a type
type GqlFields<API extends Api<any>, T extends RecordShape> =
  T['FQN'] extends string ?
    T['FQN'] extends keyof API['types'] ?
      T['Members'] & API['types'][T['FQN']]['fields'] :
      T['Members'] :
  never
;

export type ApiClient<API extends Api<any>, T extends RecordShape> = {
  [f in keyof GqlFields<API, T>]: Gql<API, GqlFields<API, T>[f]>
};

export interface GqlResult<T = any> {
  [ApiClient.result]: T;
}

type Gql<API extends Api<any>, T extends Shape> =
  T extends FunctionShape<infer Args, infer Returns> ?
    Returns extends PrimitiveShapes | ArrayShape<PrimitiveShapes> ? (
      args: { [a in keyof Args]: Value.Of<Args[a]>; }
    ) => GqlResult<Value.Of<Returns>> :

    Returns extends RecordShape ? <Result extends GqlResult>(
      args: { [a in keyof Args]: Value.Of<Args[a]>; },
      selection: (selection: GqlFieldSelector<API, GqlFields<API, Returns>>) => Result
    ) => Result :

    Returns extends ArrayShape<RecordShape> ? <Result extends GqlResult>(
      args: { [a in keyof Args]: Value.Of<Args[a]>; },
      selection: (selection: GqlFieldSelector<API, GqlFields<API, Returns['Items']>>) => Result
    ) => GqlResult<Result[ApiClient.result][]> :

    Returns extends UnionShape<RecordShape[]> ? <Result extends GqlResult>(
      selection: (selection: GqlUnionSelector<API, Returns, UnionNames<Returns>, {}>) => Result
    ) => Result :

    never :

  T extends ArrayShape<RecordShape<infer M>> ?
    <T extends GqlResult>(
      selection: (selection: GqlFieldSelector<API, M>) => T
    ) => GqlResult<T[ApiClient.result][]> :

  T extends UnionShape<RecordShape[]> ?
    <Result extends GqlResult>(
      selection: (selection: GqlUnionSelector<API, T, UnionNames<T>, {}>) => Result
    ) => Result
    :

  () => GqlResult<Value.Of<T>>
;

type GqlFieldSelector<
  API extends Api<any>,
  AllFields extends Fields,
  UnselectedFields extends keyof AllFields = keyof AllFields,
  Result extends object = {}
> = {
  [Field in UnselectedFields]:
    AllFields[Field] extends FunctionShape<infer Args, infer Returns> ?
      Returns extends PrimitiveShapes | ArrayShape<PrimitiveShapes> ? (
        args: { [a in keyof Args]: Value.Of<Args[a]>; }
      ) => Next<API, AllFields, UnselectedFields, Result, Field, Value.Of<Returns>> :

      Returns extends RecordShape ? <T extends GqlResult>(
        args: { [a in keyof Args]: Value.Of<Args[a]>; },
        selection: (selection: GqlFieldSelector<API, GqlFields<API, Returns>>) => T
      ) => Next<API, AllFields, UnselectedFields, Result, Field, T[ApiClient.result]> :

      Returns extends ArrayShape<RecordShape> ? <T extends GqlResult>(
        args: { [a in keyof Args]: Value.Of<Args[a]>; },
        selection: (selection: GqlFieldSelector<API, GqlFields<API, Returns['Items']>>) => T
      ) => Next<API, AllFields, UnselectedFields, Result, Field, T[ApiClient.result][]> :

      Returns extends UnionShape<RecordShape[]> ? <T extends GqlResult>(
        selection: (selection: GqlUnionSelector<API, Returns, UnionNames<Returns>, {}>) => T
      ) => Next<API, AllFields, UnselectedFields, Result, Field, T[ApiClient.result]>
      :
      never :

    AllFields[Field] extends ArrayShape<RecordShape<infer M>> ?
      <T extends GqlResult>(
        selection: (selection: GqlFieldSelector<API, M>) => T
      ) => Next<API, AllFields, UnselectedFields, Result, Field, T[ApiClient.result]> :

    AllFields[Field] extends UnionShape<RecordShape[]> ?
      <T extends GqlResult>(
        selection: (selection: GqlUnionSelector<API, AllFields[Field], UnionNames<AllFields[Field]>, {}>) => T
      ) => Next<API, AllFields, UnselectedFields, Result, Field, T[ApiClient.result]>
      :

    () => Next<API, AllFields, UnselectedFields, Result, Field, Value.Of<AllFields[Field]>>
};

type GqlUnionSelector<
  API extends Api<any>,
  U extends UnionShape<RecordShape[]>,
  UnselectedTypes extends string,
  Result extends object
> = {
  on<FQN extends UnselectedTypes, T extends GqlResult>(
    type: FQN,
    selection: (selection: GqlFieldSelector<API, GqlFields<API, UnionType<U, Extract<FQN, string>>>>) => T
  ): {
    [ApiClient.result]: keyof Result extends never ? {
        __typename: FQN;
      } & T[ApiClient.result] :
      Result | {
        __typename: FQN;
      } & T[ApiClient.result]
    ;
  } & GqlUnionSelector<API, U, Exclude<UnselectedTypes, FQN>,
    keyof Result extends never ? {
        __typename: FQN;
      } & T[ApiClient.result] :
      Result | {
        __typename: FQN;
      } & T[ApiClient.result]
    >
};

type UnionNames<U extends UnionShape<RecordShape[]>> =
  Extract<U['Items'][Extract<keyof U['Items'], number>]['FQN'], string>;

type UnionType<U extends UnionShape<RecordShape[]>, FQN extends UnionNames<U>> =
  Extract<U['Items'][Extract<keyof U['Items'], number>], { FQN: FQN; }>;

type Next<
  API extends Api<any>,
  AllFields extends Fields,
  UnselectedFields extends keyof AllFields,
  Result extends object,
  Field extends keyof AllFields,
  Value
> = GqlFieldSelector<API, AllFields, Exclude<UnselectedFields, Field>, Result & {
  [f in Field]: Value
}> & {
  [ApiClient.result]: Result & {
    [f in Field]: Value
  }
};