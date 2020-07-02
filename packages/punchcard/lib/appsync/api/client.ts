import { ArrayShape, Fields, FunctionShape, NothingShape, PrimitiveShapes, Shape, TypeShape, UnionShape, Value } from '@punchcard/shape';
import { Api } from './api';

export namespace GqlApiClient {
  export type result = typeof result;
  export const result = Symbol.for('result');
}

export type GqlApiClient<API extends Api<any>, T extends TypeShape> = {
  [f in keyof GqlFields<API, T>]: Exclude<Gql<API, GqlFields<API, T>[f], undefined>, undefined>;
};

// merge adhoc fields into a single view of all fields on a type
type GqlFields<API extends Api<any>, T extends TypeShape> =
  T['FQN'] extends string ?
    T['FQN'] extends keyof API['types'] ?
      T['Members'] & API['types'][T['FQN']]['fields'] :
      T['Members'] :
  never
;

export interface GqlResult<T = any> {
  [GqlApiClient.result]: T;
}

type Gql<API extends Api<any>, T extends Shape, Args extends Fields | undefined> =
  T extends FunctionShape<infer Args, infer Returns> ? {
    [k in keyof T]: Gql<API, Returns, Args>
  }[keyof T] :

  T extends PrimitiveShapes | ArrayShape<PrimitiveShapes> ?
    Args extends undefined ? () => GqlResult<Value.Of<T>> :
    (args: GqlArgs<Args>) => GqlResult<Value.Of<T>> :

  T extends TypeShape ?
    Args extends undefined ? <Result extends GqlResult>(
      selection: (selection: GqlFieldSelector<API, GqlFields<API, T>>) => Result
    ) => Result :
    <Result extends GqlResult>(
      args: GqlArgs<Args>,
      selection: (selection: GqlFieldSelector<API, GqlFields<API, T>>) => Result
    ) => Result :

  T extends ArrayShape<TypeShape> ?
    Args extends undefined ?
      <Result extends GqlResult>(
        selection: (selection: GqlFieldSelector<API, GqlFields<API, T['Items']>>) => Result
      ) => GqlResult<Result[GqlApiClient.result][]> :

      <Result extends GqlResult>(
        args: GqlArgs<Args>,
        selection: (selection: GqlFieldSelector<API, GqlFields<API, T['Items']>>) => Result
      ) => GqlResult<Result[GqlApiClient.result][]> :

  T extends UnionShape<TypeShape[], string> ?
    Args extends undefined ?
      <Result extends GqlResult>(
        selection: (selection: GqlUnionSelector<API, T, UnionNames<T>, {}>) => Result
      ) => Result :
      <Result extends GqlResult>(
        args: GqlArgs<Args>,
        selection: (selection: GqlUnionSelector<API, T, UnionNames<T>, {}>) => Result
      ) => Result :

  T extends UnionShape<
    | [NothingShape, Shape]>
    | UnionShape<[Shape, NothingShape]
    & { length: 2; }
  > ? {
    [k in keyof T]: Gql<API, Exclude<T['Items'][Extract<keyof T['Items'], number>], NothingShape>, Args>
  }[keyof T] :

  never
;

type GqlArgs<Args extends Fields | undefined> = Args extends Fields ? {
  [f in keyof Fields.Natural<Args>]: Value.Of<Args[f]>;
} : never;

// select fields as part of a GQL result
type GqlFieldSelector<
  API extends Api<any>,
  AllFields extends Fields,
  UnselectedFields extends keyof AllFields = keyof AllFields,
  Result extends object = {}
> = {
  [Field in UnselectedFields]:
    AllFields[Field] extends FunctionShape<infer Args, infer Returns> ?
      _GqlFieldSelector<API, AllFields, UnselectedFields, Result, Field, Args, Returns> :
      _GqlFieldSelector<API, AllFields, UnselectedFields, Result, Field, undefined, AllFields[Field]>
    ;
};

// helper to support accumulation of state as fields are selected as part of a chain
type _GqlFieldSelector<
  API extends Api<any>,
  AllFields extends Fields,
  UnselectedFields extends keyof AllFields,
  Result extends object,
  Field extends keyof AllFields,
  Args extends Record<string, Shape> | undefined,
  Returns extends Shape,
  Or = never
> =
  Returns extends PrimitiveShapes | ArrayShape<PrimitiveShapes> ?
    Args extends undefined ?
      () => Next<API, AllFields, UnselectedFields, Result, Field, Value.Of<Returns> | Or> :
      (args: GqlArgs<Args> ) => Next<API, AllFields, UnselectedFields, Result, Field, Value.Of<Returns> | Or> :

  Returns extends TypeShape ?
    Args extends undefined ?
      <T extends GqlResult>(
        selection: (selection: GqlFieldSelector<API, GqlFields<API, Returns>>) => T
      ) => Next<API, AllFields, UnselectedFields, Result, Field, T[GqlApiClient.result] | Or> :
      <T extends GqlResult>(
        args: GqlArgs<Args>,
        selection: (selection: GqlFieldSelector<API, GqlFields<API, Returns>>) => T
      ) => Next<API, AllFields, UnselectedFields, Result, Field, T[GqlApiClient.result] | Or> :

  Returns extends ArrayShape<TypeShape> ?
    Args extends undefined ?
      <T extends GqlResult>(
        selection: (selection: GqlFieldSelector<API, GqlFields<API, Returns['Items']>>) => T
      ) => Next<API, AllFields, UnselectedFields, Result, Field, (T[GqlApiClient.result] | Or)[]> :
      <T extends GqlResult>(
        args: GqlArgs<Args>,
        selection: (selection: GqlFieldSelector<API, GqlFields<API, Returns['Items']>>) => T
      ) => Next<API, AllFields, UnselectedFields, Result, Field, (T[GqlApiClient.result] | Or)[]> :

  Returns extends UnionShape<TypeShape[], string> ?
    Args extends undefined ?
      <T extends GqlResult>(
        selection: (selection: GqlUnionSelector<API, Returns, UnionNames<Returns>, {}>) => T
      ) => Next<API, AllFields, UnselectedFields, Result, Field, T[GqlApiClient.result] | Or> :
      <T extends GqlResult>(
        args: GqlArgs<Args>,
        selection: (selection: GqlUnionSelector<API, Returns, UnionNames<Returns>, {}>) => T
      ) => Next<API, AllFields, UnselectedFields, Result, Field, T[GqlApiClient.result] | Or> :

  Returns extends UnionShape<
    | [NothingShape, Shape]>
    | UnionShape<[Shape, NothingShape]
    & { length: 2; }
  > ? Exclude<{
    [k in keyof Returns]: _GqlFieldSelector<
      API, AllFields, UnselectedFields, Result, Field, Args,
      Exclude<Returns['Items'][Extract<keyof Returns['Items'], number>], NothingShape>,
      undefined
    >
  }[keyof Returns], undefined> :

  never
;

type GqlUnionSelector<
  API extends Api<any>,
  U extends UnionShape<TypeShape[], string>,
  UnselectedTypes extends string,
  Result extends object
> = {
  on<FQN extends UnselectedTypes, T extends GqlResult>(
    type: FQN,
    selection: (selection: GqlFieldSelector<API, GqlFields<API, UnionType<U, Extract<FQN, string>>>>) => T
  ): {
    [GqlApiClient.result]: keyof Result extends never ? {
        __typename: FQN;
      } & T[GqlApiClient.result] :
      Result | {
        __typename: FQN;
      } & T[GqlApiClient.result]
    ;
  } & GqlUnionSelector<API, U, Exclude<UnselectedTypes, FQN>,
    keyof Result extends never ? {
        __typename: FQN;
      } & T[GqlApiClient.result] :
      Result | {
        __typename: FQN;
      } & T[GqlApiClient.result]
    >
};

type UnionNames<U extends UnionShape<TypeShape[], string>> =
  Extract<U['Items'][Extract<keyof U['Items'], number>]['FQN'], string>;

type UnionType<U extends UnionShape<TypeShape[], string>, FQN extends UnionNames<U>> =
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
  [GqlApiClient.result]: Result & {
    [f in Field]: Value
  }
};
