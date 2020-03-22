import {
  ArrayShape,
  BinaryShape,
  BoolShape,
  Decorated,
  DynamicShape,
  IntegerShape,
  MapShape,
  Meta,
  NothingShape,
  NumberShape,
  RecordShape,
  SetShape,
  Shape,
  ShapeVisitor,
  StringShape,
  TimestampShape,
  Trait,
} from "@punchcard/shape";

import {KeysOfType} from "typelevel-ts";

export type Tag = typeof Tag;
export const Tag = Symbol.for("@punchcard/shape-Tag");

export const Partition: {
  [Trait.Data]: {
    isPartition: true;
  };
} = {
  [Trait.Data]: {
    isPartition: true,
  },
};

type GetComment<T extends Shape> = T extends Decorated<
  any,
  {description: infer D}
>
  ? D extends string
    ? D
    : undefined
  : undefined;

function getComment<T extends Shape>(member: T): GetComment<T> {
  return (member as any)[Decorated.Data].description;
}

type Column<K extends keyof T["Members"], T extends RecordShape<any>> = {
  name: K;
  type: glue.Type;
  comment: GetComment<T["Members"][K]>;
};

export type PartitionKeys<T extends RecordShape<any>> = KeysOfType<
  T["Members"],
  Decorated<any, {isPartition: true}>
>;

export type Columns<T extends RecordShape<any>> = {
  readonly [K in keyof T["Members"]]: Column<K, T>;
};

export function schema<T extends RecordShape<any>>(shape: T): Columns<T> {
  const columns: {[name: string]: Column<any, any>} = {};
  for (const [name, member] of Object.entries(shape.Members)) {
    const type = member.visit(SchemaVisitor.instance, null);
    const col = {
      comment: getComment(member),
      name,
      type,
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

  public nothingShape(_shape: NothingShape, _context: null): glue.Type {
    throw new Error(`Nothing Shape is not supported by Glue.`);
  }
  public dynamicShape(_shape: DynamicShape<any>): glue.Type {
    throw new Error("Dynamic type is not supported by Glue.");
  }
  public arrayShape(shape: ArrayShape<any>): glue.Type {
    return glue.Schema.array(shape.Items.visit(this, null));
  }
  public binaryShape(_shape: BinaryShape): glue.Type {
    return glue.Schema.BINARY;
  }
  public boolShape(_shape: BoolShape): glue.Type {
    return glue.Schema.BOOLEAN;
  }
  public recordShape(shape: RecordShape<any>): glue.Type {
    return glue.Schema.struct(
      Object.entries(shape.Members).map(([name, member]) => ({
        name,
        type: (member as Shape).visit(this, undefined),
      })),
    );
  }
  public mapShape(shape: MapShape<any>): glue.Type {
    return glue.Schema.map(
      glue.Schema.STRING,
      shape.Items.visit(this, undefined),
    );
  }
  public integerShape(shape: IntegerShape): glue.Type {
    const {glueType} = Meta.get(shape, ["glueType"]);
    switch (glueType) {
      case "bigint":
        return glue.Schema.BIG_INT;
      case "smallint":
        return glue.Schema.SMALL_INT;
      case "tinyint":
        return glue.Schema.TINY_INT;
      default:
        return glue.Schema.INTEGER;
    }
  }
  public numberShape(shape: NumberShape): glue.Type {
    const {glueType} = Meta.get(shape, ["glueType"]);
    switch (glueType) {
      case "float":
        return glue.Schema.FLOAT;
      default:
        return glue.Schema.DOUBLE;
    }
  }
  public setShape(shape: SetShape<any>): glue.Type {
    return glue.Schema.array(shape.Items.visit(this, undefined));
  }
  public stringShape(shape: StringShape): glue.Type {
    const {glueType, maxLength} = Meta.get(shape, ["glueType", "maxLength"]);

    switch (glueType) {
      case "char":
        return glue.Schema.char(maxLength);
      case "varchar":
        return glue.Schema.varchar(maxLength);
      default:
        return glue.Schema.STRING;
    }
  }
  public timestampShape(_shape: TimestampShape): glue.Type {
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
     * @defaultValue none
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
      inputString: "boolean",
      isPrimitive: true,
    };

    public static readonly BINARY: glue.Type = {
      inputString: "binary",
      isPrimitive: true,
    };

    /**
     * A 64-bit signed INTEGER in two’s complement format, with a minimum value of -2^63 and a maximum value of 2^63-1.
     */
    public static readonly BIG_INT: glue.Type = {
      inputString: "bigint",
      isPrimitive: true,
    };

    public static readonly DOUBLE: glue.Type = {
      inputString: "double",
      isPrimitive: true,
    };

    public static readonly FLOAT: glue.Type = {
      inputString: "float",
      isPrimitive: true,
    };

    /**
     * A 32-bit signed INTEGER in two’s complement format, with a minimum value of -2^31 and a maximum value of 2^31-1.
     */
    public static readonly INTEGER: glue.Type = {
      inputString: "int",
      isPrimitive: true,
    };

    /**
     * A 16-bit signed INTEGER in two’s complement format, with a minimum value of -2^15 and a maximum value of 2^15-1.
     */
    public static readonly SMALL_INT: glue.Type = {
      inputString: "smallint",
      isPrimitive: true,
    };

    /**
     * A 8-bit signed INTEGER in two’s complement format, with a minimum value of -2^7 and a maximum value of 2^7-1
     */
    public static readonly TINY_INT: glue.Type = {
      inputString: "tinyint",
      isPrimitive: true,
    };

    /**
     * Date type.
     */
    public static readonly DATE: glue.Type = {
      inputString: "date",
      isPrimitive: true,
    };

    /**
     * Timestamp type (date and time).
     */
    public static readonly TIMESTAMP: glue.Type = {
      inputString: "timestamp",
      isPrimitive: true,
    };

    /**
     * Arbitrary-length string type.
     */
    public static readonly STRING: glue.Type = {
      inputString: "string",
      isPrimitive: true,
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
        inputString:
          scale !== undefined
            ? `decimal(${precision},${scale})`
            : `decimal(${precision})`,
        isPrimitive: true,
      };
    }

    /**
     * Fixed length character data, with a specified length between 1 and 255.
     *
     * @param length length between 1 and 255
     */
    public static char(length: number): glue.Type {
      if (length <= 0 || length > 255) {
        throw new Error(
          `char length must be (inclusively) between 1 and 255, but was ${length}`,
        );
      }
      if (length % 1 !== 0) {
        throw new Error(
          `char length must be a positive integer, was ${length}`,
        );
      }
      return {
        inputString: `char(${length})`,
        isPrimitive: true,
      };
    }

    /**
     * Variable length character data, with a specified length between 1 and 65535.
     *
     * @param length length between 1 and 65535.
     */
    public static varchar(length: number): glue.Type {
      if (length <= 0 || length > 65535) {
        throw new Error(
          `varchar length must be (inclusively) between 1 and 65535, but was ${length}`,
        );
      }
      if (length % 1 !== 0) {
        throw new Error(
          `varchar length must be a positive integer, was ${length}`,
        );
      }
      return {
        inputString: `varchar(${length})`,
        isPrimitive: true,
      };
    }

    /**
     * Creates an array of some other type.
     *
     * @param itemType type contained by the array.
     */
    public static array(itemType: glue.Type): glue.Type {
      return {
        inputString: `array<${itemType.inputString}>`,
        isPrimitive: false,
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
        throw new Error(
          `the key type of a 'map' must be a primitive, but was ${keyType.inputString}`,
        );
      }
      return {
        inputString: `map<${keyType.inputString},${valueType.inputString}>`,
        isPrimitive: false,
      };
    }

    /**
     * Creates a nested structure containing individually named and typed columns.
     *
     * @param columns the columns of the structure.
     */
    public static struct(columns: Column[]): glue.Type {
      return {
        inputString: `struct<${columns
          .map((column) => {
            if (column.comment === undefined) {
              return `${column.name}:${column.type.inputString}`;
            } else {
              return `${column.name}:${column.type.inputString} COMMENT '${column.comment}'`;
            }
          })
          .join(",")}>`,
        isPrimitive: false,
      };
    }
  }
}
