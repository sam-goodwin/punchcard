import { ArrayShape, BinaryShape, BoolShape, Decorated, DynamicShape, IntegerShape, MapShape, Member, Meta, NothingShape, NumberShape, RecordShape, RecordType, SetShape, Shape, StringShape, TimestampShape, Trait, Visitor as ShapeVisitor } from '@punchcard/shape';

import glue = require('@aws-cdk/aws-glue');
import { KeysOfType } from 'typelevel-ts';

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

type Column<K extends keyof T['Members'], T extends RecordShape<any>> = {
  name: K;
  type: glue.Type;
  comment: GetComment<T['Members'][K]>;
};

export type PartitionKeys<T extends RecordType> = KeysOfType<T[RecordShape.Members], Decorated<any, { isPartition: true; }>>;

export type Columns<T extends RecordType> = {
  readonly [K in keyof T[RecordShape.Members]]: Column<K, Shape.Of<T>>;
};

export function schema<T extends RecordType>(type: T): Columns<T> {
  const shape = Shape.of(type);
  const columns: { [name: string]: Column<any, any>; } = {};
  for (const member of Object.values(shape.Members)) {
    const type = member.Shape.visit(SchemaVisitor.instance);
    const col = {
      name: member.Name,
      type,
      comment: getComment(member)
    };
    if (!col.comment) {
      delete col.comment;
    }
    columns[member.Name] = col;
  }
  return columns as any;
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
    return glue.Schema.array(shape.Items.visit(this, null));
  }
  public binaryShape(shape: BinaryShape): glue.Type {
    return glue.Schema.BINARY;
  }
  public boolShape(shape: BoolShape): glue.Type {
    return glue.Schema.BOOLEAN;
  }
  public recordShape(shape: RecordShape<any>): glue.Type {
    return glue.Schema.struct(Object.values(shape.Members)
      .map(member => ({
        name: member.Name,
        type: member.Shape.visit(this, null)
      })));
  }
  public mapShape(shape: MapShape<any>): glue.Type {
    return glue.Schema.map(glue.Schema.STRING, shape.Items.visit(this, null));
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
    return glue.Schema.array(shape.Items.visit(this, null));
  }
  public stringShape(shape: StringShape): glue.Type {
    const { glueType, maxLength } = Meta.get(shape, ['glueType', 'maxLength']);

    switch (glueType) {
      case 'char':
        return glue.Schema.char(maxLength);
      case 'varchar':
        return glue.Schema.varchar(maxLength);
      default:
        return glue.Schema.STRING;
    }
  }
  public timestampShape(shape: TimestampShape): glue.Type {
    return glue.Schema.TIMESTAMP;
  }
}
