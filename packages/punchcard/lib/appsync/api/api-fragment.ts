import { RecordShape, Shape, ShapeGuards, UnionToIntersection } from '@punchcard/shape';
import { MutationRoot, QueryRoot, SubscriptionRoot } from './root';
import { TypeSpec, TypeSystem } from './type-system';

export class ApiFragment<I extends TypeSystem> {
  public readonly Types: I;

  constructor(types: I) {
    const _types = types as any;

    emptyDefault(QueryRoot);
    emptyDefault(MutationRoot);
    emptyDefault(SubscriptionRoot);

    this.Types = _types;

    function emptyDefault<T extends RecordShape<any, string>>(type: T) {
      if (_types[type.FQN] === undefined) {
        _types[type.FQN] = {
          type,
          fields: {},
          resolvers: {}
        };
      }
    }
  }
}

export namespace ApiFragment {
  export type Concat<F extends ApiFragment<TypeSystem>[]> = UnionToIntersection<F[keyof F]>;

  export function concat<F extends ApiFragment<any>[]>(...fragments: F): ApiFragment.Concat<F> {
    const implIndex: TypeSystem = {
      [MutationRoot.FQN]: {
        type: MutationRoot,
        fields: {},
        resolvers: {}
      },
      [QueryRoot.FQN]: {
        type: QueryRoot,
        fields: {},
        resolvers: {}
      },
      [SubscriptionRoot.FQN]: {
        type: SubscriptionRoot,
        fields: {},
        resolvers: {}
      }
    };

    for (const fragment of fragments) {
      for (const typeSpec of Object.values(fragment.Types) as TypeSpec[]) {
        Object
          .values(typeSpec.fields)
          .map(getTypes)
          .reduce((a, b) => a.concat(b), [])
          .forEach(shape => merge({
            type: shape,
            fields: shape.Members,
            resolvers: {}
          }));

        merge(typeSpec);
      }
    }

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
      const prev = implIndex[typeSpec.type.FQN];
      if (prev !== undefined) {
        implIndex[typeSpec.type.FQN] = {
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
        implIndex[typeSpec.type.FQN] = typeSpec;
      }
    }

    return new ApiFragment(implIndex) as any;
  }
}
