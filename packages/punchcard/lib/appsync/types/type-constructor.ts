import { Pointer, Record, RecordMembers, RecordShape, RecordType, Shape } from '@punchcard/shape';
import { Construct, Scope } from '../../core/construct';
import { VExpression } from '../syntax/expression';
import { Resolved } from '../syntax/resolver';
import { VObject } from './object';
import { VTL } from './vtl';

// export type TypeDescriptor<Self extends RecordShape, Fields> = {
//   self: Self;
//   typeName?: string;
//   fields?: (self: {
//     [m in keyof Self['Members']]: VObject.Of<Shape.Resolve<Pointer.Resolve<Self['Members'][m]>>>;
//   }) => Fields;
// };

// export function GraphQLType<Self extends RecordShape, Fields>(
//   desc: TypeDescriptor<Self, Fields>
// ): Self & Fields {
//   const data: object = desc.self || {};
//   const methods: object = desc.fields || {};
//   return { ...data, ...methods } as Self & Fields;
// }

// export type Component<C = any, P = undefined> = (scope: Scope, props?: P) => C;

export const graphQlType = Symbol.for('graphql.type');

export interface GraphQLTypeProps<M extends RecordMembers> {
  /**
   * Name of the GraphQL Type.
   *
   * @default - id of the construct
   */
  typeName?: string;

  /**
   * Fields in the GraphQL Type.
   */
  fields: M | RecordShape<M>;
}

export class GraphQLType<M extends RecordMembers = any> {
  public readonly [graphQlType]: true = true;
  public readonly Record: RecordType<M>;
  public readonly Shape: RecordShape<M>;

  public readonly self: {
    [m in keyof M]: VObject.Of<Shape.Resolve<Pointer.Resolve<M[m]>>>;
  };

  constructor(props: GraphQLTypeProps<M>) {}

  public fields<F extends { [fieldName: string]: Resolved<any>}>(fields: (self: {
    [m in keyof M]: VObject.Of<Shape.Resolve<Pointer.Resolve<M[m]>>>;
  }) => F): {
    [f in keyof F]: F[f];
  } {
    return fields(this.self);
  }

  public field<Ret extends GraphQLType>(name: string, resolver: Resolved<Ret>) {}
}

/**
 * Creates a new GraphQL type that supports resolver fields.
 *
 * @param members
 */
// export function GraphQLTypeConstructor<M extends RecordMembers>(members: M):  {
//   Record: RecordType<M>;
//   Shape: RecordShape<M>;
// } & Construct.Class<GraphQLType<M> & {
//   [m in keyof M]: VObject.Of<Shape.Resolve<Pointer.Resolve<M[m]>>>;
// }> {
//   const record = Record(members);
//   return class NewType extends GraphQLType<M> {
//     public static readonly Record = record;
//     public static readonly Shape = record;

//     public readonly Shape = record;
//     public readonly Record = record;

//     /**
//      * A reference to `$context.source` as 'this'.
//      */
//     public readonly $this = VTL.of(record, new VExpression('$context.source'));

//     public $field<T extends Shape.Like>(type: T): Resolver<{}, Shape.Resolve<T>> {
//       return Resolver.new({}, type);
//     }
//   } as any;
// }