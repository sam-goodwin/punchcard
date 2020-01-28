import { ArrayShape, BinaryShape, BoolShape, ClassShape, ClassType, Decorated, DynamicShape, IntegerShape, KeysOfType, MapShape, Member, Meta, NothingShape, NumberShape, SetShape, Shape, StringShape, TimestampShape, Trait, Visitor as ShapeVisitor } from '@punchcard/shape';

import glue = require('@aws-cdk/aws-glue');

export type Tag = typeof Tag;
export const Tag = Symbol.for('@punchcard/shape-glue.Tag');

export const Partition: {
  [Trait.Data]: {
    isPartition: true
  }
} = {
  [Trait.Data]: {
    isPartition: true
  }
};

export interface Columns {
  [name: string]: Column<any, any>;
}

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

export type PartitionKeys<T extends ClassType> = KeysOfType<InstanceType<T>, Decorated<any, { isPartition: true; }>>;

export type Schema<T extends ClassType> = {
  readonly columns: {
    [K in Exclude<keyof InstanceType<T>, PartitionKeys<T>>]: Column<K, ClassShape<T>>;
  }
  readonly partitionKeys: {
    [K in PartitionKeys<T>]: Column<K, ClassShape<T>>;
  }
};

export function schema<T extends ClassType>(type: T): Schema<T> {
  const shape = Shape.of(type);
  const columns: { [name: string]: Column<any, any>; } = {};
  const partitionKeys: { [name: string]: Column<any, any>; } = {};
  for (const member of Object.values(shape.Members)) {
    const type = member.Type.visit(SchemaVisitor.instance);
    const col = {
      name: member.Name,
      type,
      comment: getComment(member)
    };
    if (member.Metadata.isPartition === true) {
      partitionKeys[member.Name] = col;
    } else {
      columns[member.Name] = col;
    }
  }
  return {
    columns,
    partitionKeys
  } as any;
}

export class SchemaVisitor implements ShapeVisitor<glue.Type, null> {
  public static readonly instance = new SchemaVisitor();

  public nothingShape(shape: NothingShape, context: null): glue.Type {
    throw new Error(`Nothing Shape is not supported by Glue.`);
  }
  public dynamicShape(shape: DynamicShape<any>): glue.Type {
    throw new Error("Dynamic type is not supported by Glue.");
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
  public integerShape(shape: IntegerShape): glue.Type {
    const { glueType } = Meta.get(shape, ['glueType']);
    switch (glueType) {
      case 'bigint':
        return glue.Schema.BIG_INT;
      case 'smallint':
        return glue.Schema.SMALL_INT;
      case 'tinyint':
        return glue.Schema.TINY_INT;
      default:
        return glue.Schema.INTEGER;
    }
  }
  public numberShape(shape: NumberShape): glue.Type {
    const { glueType } = Meta.get(shape, ['glueType']);
    switch (glueType) {
      case 'float':
        return glue.Schema.FLOAT;
      default:
        return glue.Schema.DOUBLE;
    }
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
