import { Pointer, Record, RecordMembers, RecordShape, RecordType, Shape } from '@punchcard/shape';
import { Construct, Scope } from '../../core/construct';
import { VExpression } from '../syntax/expression';
import { Resolver } from '../syntax/resolver';
import { VObject } from './object';
import { VTL } from './vtl';

export type TypeDescriptor<Self extends RecordShape, Fields> = {
  self: Self;
  typeName?: string;
  fields?: (self: {
    [m in keyof Self['Members']]: VObject.Of<Shape.Resolve<Pointer.Resolve<Self['Members'][m]>>>;
  }) => Fields;
};

export function GraphQLType<Self extends RecordShape, Fields>(
  desc: TypeDescriptor<Self, Fields>
): Self & Fields {
  const data: object = desc.self || {};
  const methods: object = desc.fields || {};
  return { ...data, ...methods } as Self & Fields;
}

export type Component<C = any, P = undefined> = (scope: Scope, props?: P) => C;

/**
 * Creates a new GraphQL type that supports resolver fields.
 *
 * @param members
 */
export function TypeConstructor<M extends RecordMembers>(members: M):  {
  Record: RecordType<M>;
  Shape: RecordShape<M>;
} & Construct.Class<Construct & {
  Record: RecordType<M>;
  Shape: RecordShape<M>;
  $: VObject.Of<RecordType<M>>;
  // $field: <T extends Shape.Like>(type: T) => Resolver<{}, Shape.Resolve<T>>;
} & {
  [m in keyof M]: VObject.Of<Shape.Resolve<Pointer.Resolve<M[m]>>>;
}> {
  const record = Record(members);
  return class NewType extends Construct {
    public static readonly Record = record;
    public static readonly Shape = record;

    public readonly Shape = record;
    public readonly Record = record;

    /**
     * A reference to `$context.source` as 'this'.
     */
    public readonly $this = VTL.of(record, new VExpression('$context.source'));
    public readonly $ = this.$this;

    public $field<T extends Shape.Like>(type: T): Resolver<{}, Shape.Resolve<T>> {
      return Resolver.new({}, type);
    }
  };
}