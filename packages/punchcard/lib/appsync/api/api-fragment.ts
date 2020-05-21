import { ArrayShape, Fields, FunctionShape, RecordShape, Shape, ShapeGuards, UnionToIntersection } from '@punchcard/shape';
import { SubscriptionImpl } from './subscription';
import { TraitImpl } from './trait';
import { TypeSpec } from './type-system';

export class ApiFragment<
  T extends RecordShape<{}, string> = RecordShape<{}, string>,
  F extends Fields = {}
> {
  constructor(
    public readonly type: T,
    public readonly fields: F,
    public readonly resolvers: TraitImpl<T, F> | SubscriptionImpl<F>
  ) {}
}

export namespace ApiFragments {
  type ByFQN<FQN extends string> = {
    type: {
      readonly FQN: FQN;
    }
  };

  export type GetType<
    F extends readonly ApiFragment[],
    FQN extends string
  > = UnionToIntersection<
    Extract<F[keyof F], ByFQN<FQN>>
  > & {
    fields: Extract<{
      [i in Extract<keyof F, number>]: F[i]['type']
    }[Extract<keyof F, number>], RecordShape<Fields, FQN>>['Members']
  };

  export type ListTypeNames<
    Fragments extends readonly ApiFragment[]
  > = Extract<Fragments[keyof Fragments], ByFQN<string>>['type']['FQN'];

  export type Reduce<
    Fragments extends readonly ApiFragment[],
  > = {
    readonly [FQN in ListTypeNames<Fragments>]: GetType<Fragments, FQN>;
  };

  export function reduce<Fragments extends readonly ApiFragment[]>(...fragments: Fragments): Reduce<Fragments> {
    const index: Record<string, TypeSpec> = {};

    for (const fragment of fragments) {
      Object
        .values(fragment.fields as Record<string, Shape>)
        .map(getTypes)
        .reduce((a, b) => a.concat(b), [])
        .forEach(shape => merge({
          type: shape,
          fields: shape.Members,
          resolvers: {}
        }));

      merge(fragment);
    }

    return index as Reduce<Fragments>;

    function getTypes(shape: Shape): RecordShape<any, string>[] {
      if (ShapeGuards.isFunctionShape(shape)) {
        return getTypes(shape.returns);
      } else if (ShapeGuards.isArrayShape(shape)) {
        return getTypes(shape.Items);
      } else if (ShapeGuards.isRecordShape(shape) && shape.FQN !== undefined) {
        return Object
          .values(shape.Members)
          .map(m => getTypes(m as any))
          .reduce((a, b) => a.concat(b))
          .concat([shape] as any);
      }
      return [];
    }

    function merge(typeSpec: TypeSpec) {
      const prev = index[typeSpec.type.FQN];
      if (prev !== undefined) {
        index[typeSpec.type.FQN] = {
          type: typeSpec.type,
          fields: {
            ...prev.fields,
            ...typeSpec.fields
          },
          resolvers: {
            ...prev.resolvers,
            ...typeSpec.resolvers
          }
        };
      } else {
        index[typeSpec.type.FQN] = typeSpec;
      }
    }
  }
}
