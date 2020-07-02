import { AnyShape, ArrayShape, BinaryShape, BoolShape, Decorated, EnumShape, IntegerShape, LiteralShape, MapShape, Meta, NeverShape, NothingShape, NumberShape, SetShape, Shape, ShapeGuards, ShapeVisitor, string, StringShape, TimestampShape, Trait, TypeShape, UnionShape } from '@punchcard/shape';
import { FunctionArgs, FunctionShape } from '@punchcard/shape/lib/function';

import { KeysOfType } from 'typelevel-ts';

export type Tag = typeof Tag;
export const Tag = Symbol.for('@punchcard/shape-Tag');

export const Partition: {
  [Trait.Data]: {
    isPartition: true
  }
} = {
  [Trait.Data]: {
    isPartition: true
  }
};

type GetComment<T extends Shape> =
  T extends Decorated<any, { description: infer D }> ?
    D extends string ?
      D :
      undefined :
    undefined
  ;

function getComment<T extends Shape>(member: T): GetComment<T> {
  const _member = member as any;
  if (_member[Decorated.Data]) {
    return _member[Decorated.Data].description;
  }
  return undefined as GetComment<T>;
}

type Column<K extends keyof T['Members'], T extends TypeShape<any>> = {
  name: K;
  type: glue.Type;
  comment: GetComment<T['Members'][K]>;
};

export type PartitionKeys<T extends TypeShape<any>> = KeysOfType<T['Members'], Decorated<any, { isPartition: true; }>>;

export type Columns<T extends TypeShape<any>> = {
  readonly [K in keyof T['Members']]: Column<K, T>;
};

export function schema<T extends TypeShape<any>>(shape: T): Columns<T> {
  const columns: { [name: string]: Column<any, any>; } = {};
  for (const [name, member] of Object.entries(shape.Members) as [string, Shape][]) {
    const type = member.visit(SchemaVisitor.instance, null);
    const col = {
      name,
      type,
      comment: getComment(member)
    };
    if (!col.comment) {
      delete col.comment;
    }
    columns[name] = col as Column<any, any>;
  }
  return columns as any;
}

export class SchemaVisitor implements ShapeVisitor<glue.Type, null> {
  public static readonly instance = new SchemaVisitor();

  public enumShape(shape: EnumShape<any, any>, context: null): glue.Type {
    return glue.Schema.STRING;
  }
  public literalShape(shape: LiteralShape<Shape, any>, context: null): glue.Type {
    return shape.Type.visit(this, context);
  }
  public unionShape(shape: UnionShape<Shape[]>, context: null): glue.Type {
    throw new Error('Union shape is not supported by Hive');
  }
  public neverShape(shape: NeverShape, context: null): glue.Type {
    throw new Error('Never shape is not supported by Hive');
  }
  public functionShape(shape: FunctionShape<FunctionArgs, Shape>): glue.Type {
    throw new Error('Function shape is not supported by Hive');
  }
  public nothingShape(shape: NothingShape, context: null): glue.Type {
    throw new Error(`Nothing Shape is not supported by Glue.`);
  }
  public anyShape(shape: AnyShape): glue.Type {
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
  public recordShape(shape: TypeShape<any>): glue.Type {
    return glue.Schema.struct(Object.entries(shape.Members)
      .map(([name, member]) => ({
        name,
        type: (member as Shape).visit(this, null)
      })));
  }
  public mapShape(shape: MapShape<any>): glue.Type {
    return glue.Schema.map(glue.Schema.STRING, shape.Items.visit(this, null));
  }
  public numberShape(shape: NumberShape): glue.Type {
    const { glueType } = Meta.get(shape, ['glueType']);
    if (ShapeGuards.isIntegerShape(shape)) {
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
    } else {
      switch (glueType) {
        case 'float':
          return glue.Schema.FLOAT;
        default:
          return glue.Schema.DOUBLE;
      }
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

// COPIED FROM @aws-cdk/aws-glue to avoid depending on the entire framework.
export namespace glue {
  /**
   * A column of a table.
   */
  export interface Column {
    /**
     * Name of the column.
     */
    readonly name: string;

    /**
     * Type of the column.
     */
    readonly type: glue.Type;

    /**
     * Coment describing the column.
     *
     * @default none
     */
    readonly comment?: string;
  }

  /**
   * Represents a type of a column in a table schema.
   */
  export interface Type {
    /**
     * Indicates whether this type is a primitive data type.
     */
    readonly isPrimitive: boolean;

    /**
     * Glue InputString for this type.
     */
    readonly inputString: string;
  }

  /**
   * @see https://docs.aws.amazon.com/athena/latest/ug/data-types.html
   */
  export class Schema {
    public static readonly BOOLEAN: glue.Type = {
      isPrimitive: true,
      inputString: 'boolean'
    };

    public static readonly BINARY: glue.Type = {
      isPrimitive: true,
      inputString: 'binary'
    };

    /**
     * A 64-bit signed INTEGER in two’s complement format, with a minimum value of -2^63 and a maximum value of 2^63-1.
     */
    public static readonly BIG_INT: glue.Type = {
      isPrimitive: true,
      inputString: 'bigint'
    };

    public static readonly DOUBLE: glue.Type = {
      isPrimitive: true,
      inputString: 'double'
    };

    public static readonly FLOAT: glue.Type = {
      isPrimitive: true,
      inputString: 'float'
    };

    /**
     * A 32-bit signed INTEGER in two’s complement format, with a minimum value of -2^31 and a maximum value of 2^31-1.
     */
    public static readonly INTEGER: glue.Type = {
      isPrimitive: true,
      inputString: 'int'
    };

    /**
     * A 16-bit signed INTEGER in two’s complement format, with a minimum value of -2^15 and a maximum value of 2^15-1.
     */
    public static readonly SMALL_INT: glue.Type = {
      isPrimitive: true,
      inputString: 'smallint'
    };

    /**
     * A 8-bit signed INTEGER in two’s complement format, with a minimum value of -2^7 and a maximum value of 2^7-1
     */
    public static readonly TINY_INT: glue.Type = {
      isPrimitive: true,
      inputString: 'tinyint'
    };

    /**
     * Date type.
     */
    public static readonly DATE: glue.Type = {
      isPrimitive: true,
      inputString: 'date'
    };

    /**
     * Timestamp type (date and time).
     */
    public static readonly TIMESTAMP: glue.Type = {
      isPrimitive: true,
      inputString: 'timestamp'
    };

    /**
     * Arbitrary-length string type.
     */
    public static readonly STRING: glue.Type = {
      isPrimitive: true,
      inputString: 'string'
    };

    /**
     * Creates a decimal type.
     *
     * TODO: Bounds
     *
     * @param precision the total number of digits
     * @param scale the number of digits in fractional part, the default is 0
     */
    public static decimal(precision: number, scale?: number): glue.Type {
      return {
        isPrimitive: true,
        inputString: scale !== undefined ? `decimal(${precision},${scale})` : `decimal(${precision})`
      };
    }

    /**
     * Fixed length character data, with a specified length between 1 and 255.
     *
     * @param length length between 1 and 255
     */
    public static char(length: number): glue.Type {
      if (length <= 0 || length > 255) {
        throw new Error(`char length must be (inclusively) between 1 and 255, but was ${length}`);
      }
      if (length % 1 !== 0) {
        throw new Error(`char length must be a positive integer, was ${length}`);
      }
      return {
        isPrimitive: true,
        inputString: `char(${length})`
      };
    }

    /**
     * Variable length character data, with a specified length between 1 and 65535.
     *
     * @param length length between 1 and 65535.
     */
    public static varchar(length: number): glue.Type {
      if (length <= 0 || length > 65535) {
        throw new Error(`varchar length must be (inclusively) between 1 and 65535, but was ${length}`);
      }
      if (length % 1 !== 0) {
        throw new Error(`varchar length must be a positive integer, was ${length}`);
      }
      return {
        isPrimitive: true,
        inputString: `varchar(${length})`
      };
    }

    /**
     * Creates an array of some other type.
     *
     * @param itemType type contained by the array.
     */
    public static array(itemType: glue.Type): glue.Type {
      return {
        isPrimitive: false,
        inputString: `array<${itemType.inputString}>`
      };
    }

    /**
     * Creates a map of some primitive key type to some value type.
     *
     * @param keyType type of key, must be a primitive.
     * @param valueType type fo the value indexed by the key.
     */
    public static map(keyType: glue.Type, valueType: glue.Type): glue.Type {
      if (!keyType.isPrimitive) {
        throw new Error(`the key type of a 'map' must be a primitive, but was ${keyType.inputString}`);
      }
      return {
        isPrimitive: false,
        inputString: `map<${keyType.inputString},${valueType.inputString}>`
      };
    }

    /**
     * Creates a nested structure containing individually named and typed columns.
     *
     * @param columns the columns of the structure.
     */
    public static struct(columns: Column[]): glue.Type {
      return {
        isPrimitive: false,
        inputString: `struct<${columns.map(column => {
          if (column.comment === undefined) {
            return `${column.name}:${column.type.inputString}`;
          } else {
            return `${column.name}:${column.type.inputString} COMMENT '${column.comment}'`;
          }
        }).join(',')}>`
      };
    }
  }
}