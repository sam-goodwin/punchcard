import { ArrayShape, BinaryShape, BoolShape, ClassShape, ClassType, DynamicShape, KeysOfType, MapShape, Member, NumberShape, SetShape, Shape, StringShape, TimestampShape, Trait, Visitor as ShapeVisitor } from '@punchcard/shape';

import glue = require('@aws-cdk/aws-glue');

export namespace Glue {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-glue.Tag');

  export interface Columns {
    [name: string]: Column<any, any>;
  }

  export function Partition(): Trait<any, { partition: true }> {
    return {
      [Trait.Data]: {
        partition: true
      }
    };
  }

  type PartitionKeys<T extends ClassShape<any>> = KeysOfType<T['Members'], Member<any, any, { partition: true }>>;
  type GetComment<M extends Member> =
    M extends Member<any, any, { description: infer D }> ?
      D extends string ?
        D :
        undefined :
      undefined
    ;
  function getComment<M extends Member>(member: M): GetComment<M> {
    return member.Metadata.description;
  }

  type Column<K extends keyof T['Members'], T extends ClassShape<any>> = {
    name: K;
    type: glue.Type;
    comment: GetComment<T['Members'][K]>;
  };

  export type TableSchema<Name extends string, T extends ClassShape<any>> = {
    name: Name;
    columns: {
      [K in Exclude<keyof T['Members'], PartitionKeys<T>>]: Column<K, T>;
    };
    partitionKeys: {
      [K in PartitionKeys<T>]: Column<K, T>;
    };
  };

  export function table<N extends string, T extends ClassType>(name: N, type: T): TableSchema<N, ClassShape<T>> {
    const shape = Shape.of(type);
    const columns: { [name: string]: Column<any, any>; } = {};
    const partitionKeys: { [name: string]: Column<any, any>; } = {};
    for (const member of Object.values(shape.Members)) {
      const type = member.Type.visit(visitor);
      const column = {
        name: member.Name,
        type,
        comment: getComment(member)
      };
      if (member.Metadata.partition === true) {
        partitionKeys[member.Name] = column;
      } else {
        columns[member.Name] = column;
      }
    }

    return {
      name,
      columns,
      partitionKeys
    } as any;
  }

  export class Visitor implements ShapeVisitor<glue.Type, null> {
    public dynamicShape(shape: DynamicShape<any>): glue.Type {
      throw new Error("Dynamic type is not supported.");
    }
    public arrayShape(shape: ArrayShape<any>): glue.Type {
      return glue.Schema.array(shape.visit(this, null));
    }
    public binaryShape(shape: BinaryShape): glue.Type {
      return glue.Schema.BINARY;
    }
    public boolShape(shape: BoolShape): glue.Type {
      return glue.Schema.BOOLEAN;
    }
    public classShape(shape: ClassShape<any>): glue.Type {
      return glue.Schema.struct(Object.values(shape.Members)
        .map(member => ({
          name: member.Name,
          type: member.Type.visit(this, null)
        })));
    }
    public mapShape(shape: MapShape<any>): glue.Type {
      return glue.Schema.map(glue.Schema.STRING, shape.visit(this, null));
    }
    public numberShape(shape: NumberShape): glue.Type {
      // TODO: integer shape
      return glue.Schema.DOUBLE;
    }
    public setShape(shape: SetShape<any>): glue.Type {
      return glue.Schema.array(shape.visit(this, null));
    }
    public stringShape(shape: StringShape): glue.Type {
      return glue.Schema.STRING;
    }
    public timestampShape(shape: TimestampShape): glue.Type {
      return glue.Schema.TIMESTAMP;
    }
  }
  export const visitor = new Visitor();
}
