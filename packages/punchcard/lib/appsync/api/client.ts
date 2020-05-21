import { ArrayShape, FunctionShape, PrimitiveShapes, RecordMembers, RecordShape, Value } from '@punchcard/shape';
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

export type ApiClient<API extends Api<any>, T extends RecordShape> = GqlFieldSelector<API, GqlFields<API, T>>;

export interface GqlResult<T = any> {
  [ApiClient.result]: T;
}

type GqlFieldSelector<
  API extends Api<any>,
  Fields extends RecordMembers,
  UnselectedFields extends keyof Fields = keyof Fields,
  Result extends object = {}
> = {
  [Field in UnselectedFields]:
    Fields[Field] extends FunctionShape<infer Args, infer Returns> ?
      Returns extends PrimitiveShapes | ArrayShape<PrimitiveShapes> ? (
        args: { [a in keyof Args]: Value.Of<Args[a]>; }
      ) => Next<API, Fields, UnselectedFields, Result, Field, Value.Of<Returns>> :

      Returns extends RecordShape ? <T extends GqlResult>(
        args: { [a in keyof Args]: Value.Of<Args[a]>; },
        selection: (selection: GqlFieldSelector<API, GqlFields<API, Returns>>) => T
      ) => Next<API, Fields, UnselectedFields, Result, Field, T[ApiClient.result]> :

      Returns extends ArrayShape<RecordShape> ? <T extends GqlResult>(
        args: { [a in keyof Args]: Value.Of<Args[a]>; },
        selection: (selection: GqlFieldSelector<API, GqlFields<API, Returns['Items']>>) => T
      ) => Next<API, Fields, UnselectedFields, Result, Field, T[ApiClient.result][]> :

      never :

    Fields[Field] extends ArrayShape<RecordShape<infer M>> ?
      <T extends GqlResult>(
        selection: (selection: GqlFieldSelector<API, M>) => T
      ) => Next<API, Fields, UnselectedFields, Result, Field, T[ApiClient.result]> :

    () => Next<API, Fields, UnselectedFields, Result, Field, Value.Of<Fields[Field]>>
};

type Next<
  API extends Api<any>,
  Fields extends RecordMembers,
  Available extends keyof Fields,
  Result extends object,
  Field extends keyof Fields,
  Value
> = GqlFieldSelector<API, Fields, Exclude<Available, Field>, Result & {
  [f in Field]: Value
}> & {
  [ApiClient.result]: Result & {
    [f in Field]: Value
  }
};