import { ArrayShape, CollectionShape, MapShape, SetShape } from './collection';
import { FunctionArgs, FunctionShape } from './function';
import { LiteralShape } from './literal';
import { Decorated } from './metadata';
import { AnyShape, BinaryShape, BoolShape, IntegerShape, NeverShape, NothingShape, NumberShape, StringShape, TimestampShape } from './primitive';
import { Fields, RecordShape } from './record';
import { Shape } from './shape';
import { UnionShape } from './union';

export namespace ShapeGuards {
  export const isAnyShape = (a: any): a is AnyShape => isShape(a) && a.Kind === 'anyShape';
  export const assertAnyShape = (a: any): asserts a is AnyShape => {
    if (!isAnyShape(a)) {
      throw new Error(`${a} is not of type: AnyShape`);
    }
  };

  export const isBinaryShape = (a: any): a is BinaryShape => isShape(a) && a.Kind === 'binaryShape';
  export const assertBinaryShape = (a: any): asserts a is BinaryShape => {
    if (!isBinaryShape(a)) {
      throw new Error(`${a} is not of type: BinaryShape`);
    }
  };

  export const isCollectionShape = (a: any): a is CollectionShape<Shape> => isArrayShape(a) || isSetShape(a) || isMapShape(a);
  export const assertCollectionShape = (a: any): asserts a is CollectionShape<Shape> => {
    if (!isCollectionShape(a)) {
      throw new Error(`${a} is not of type: CollectionShape`);
    }
  };
  export const isArrayShape = (a: any): a is ArrayShape<Shape> => a.Kind === 'arrayShape';
  export const assertArrayShape = (a: any): asserts a is ArrayShape<Shape> => {
    if (!isArrayShape(a)) {
      throw new Error(`${a} is not of type: ArrayShape`);
    }
  };
  export const isBoolShape = (a: any): a is BoolShape => isShape(a) && a.Kind === 'boolShape';
  export const assertBoolShape = (a: any): asserts a is BoolShape => {
    if (!isBoolShape(a)) {
      throw new Error(`${a} is not of type: BoolShape`);
    }
  };
  export const isFunctionShape = (a: any): a is FunctionShape<FunctionArgs, Shape> => isShape(a) && a.Kind === 'functionShape';
  export const assertFunctionShape = (a: any): asserts a is FunctionShape<FunctionArgs, Shape> => {
    if (!isFunctionShape(a)) {
      throw new Error(`${a} is not of type: FunctionShape`);
    }
  };
  export const isRecordShape = (a: any): a is RecordShape<Fields> => isShape(a) && a.Kind === 'recordShape';
  export const assertRecordShape = (a: any): asserts a is RecordShape<Fields> => {
    if (!isRecordShape(a)) {
      throw new Error(`${a} is not of type: RecordShape`);
    }
  };

  export const isMapShape = (a: any): a is MapShape<Shape> => a.Kind === 'mapShape';
  export const assertMapShape = (a: any): asserts a is MapShape<Shape> => {
    if (!isMapShape(a)) {
      throw new Error(`${a} is not of type: MapShape`);
    }
  };
  export const isNeverShape = (a: any): a is NeverShape => isShape(a) && a.Kind === 'neverShape';
  export const assertNeverShape = (a: any): asserts a is NeverShape => {
    if (!isNeverShape(a)) {
      throw new Error(`${a} is not of type: NeverShape`);
    }
  };
  export const isIntegerShape = (a: any): a is IntegerShape => isNumberShape(a) && (a[Decorated.Data] as any).numberType === 'integer';
  export const assertIntegerShape = (a: any): asserts a is IntegerShape => {
    if (!isIntegerShape(a)) {
      throw new Error(`${a} is not of type: IntegerShape`);
    }
  };
  export const isLiteralShape = (a: any): a is LiteralShape<Shape, any> => isShape(a) && a.Kind === 'literalShape';
  export const assertLiteralShape = (a: any): asserts a is LiteralShape<Shape, any> => {
    if (!isLiteralShape(a)) {
      throw new Error(`${a} is not of type: LiteralShape`);
    }
  };
  export const isNothingShape = (a: any): a is NothingShape => isShape(a) && a.Kind === 'nothingShape';
  export const assertNothingShape = (a: any): asserts a is NothingShape => {
    if (!isNothingShape(a)) {
      throw new Error(`${a} is not of type: NothingShape`);
    }
  };
  export const isNumberShape = (a: any): a is NumberShape => isShape(a) && a.Kind === 'numberShape';
  export const assertNumberShape = (a: any): asserts a is NumberShape => {
    if (!isNumberShape(a)) {
      throw new Error(`${a} is not of type: NumberShape`);
    }
  };

  export const isSetShape = (a: any): a is SetShape<Shape> => isShape(a) && a.Kind === 'setShape';
  export const assertSetShape = (a: any): asserts a is SetShape<Shape> => {
    if (!isSetShape(a)) {
      throw new Error(`${a} is not of type: SetShape`);
    }
  };
  export const isShape = (a: any): a is Shape => a && a.NodeType === 'shape';
  export const assertShape = (a: any): asserts a is Shape => {
    if (!isShape(a)) {
      throw new Error(`${a} is not of type: Shape`);
    }
  };
  export const isStringShape = (a: any): a is StringShape => isShape(a) && a.Kind === 'stringShape';
  export const assertStringShape = (a: any): asserts a is StringShape => {
    if (!isStringShape(a)) {
      throw new Error(`${a} is not of type: StringShape`);
    }
  };
  export const isTimestampShape = (a: any): a is TimestampShape => isShape(a) && a.Kind === 'timestampShape';
  export const assertTimestampShape = (a: any): asserts a is TimestampShape => {
    if (!isTimestampShape(a)) {
      throw new Error(`${a} is not of type: TimestampShape`);
    }
  };
  export const isUnionShape = (a: any): a is UnionShape<Shape[]> => isShape(a) && a.Kind === 'unionShape';
  export const assertUnionShape = (a: any): asserts a is UnionShape<Shape[]> => {
    if (!isUnionShape(a)) {
      throw new Error(`${a} is not of type: UnionShape`);
    }
  };

  export type IsArrayShape<T> = T extends ArrayShape<Shape> ? T : never;
  export type IsRecordShape<T> = T extends RecordShape<Fields> ? T : never;
  export type IsMapShape<T> = T extends MapShape<Shape> ? T : never;
  export type IsNumberShape<T> = T extends NumberShape ? T : never;
  export type IsSetShape<T> = T extends SetShape<Shape> ? T : never;
  export type IsShape<T> = T extends Shape ? T : never;
  export type IsStringShape<T> = T extends StringShape ? T : never;
  export type IsTimestampShape<T> = T extends TimestampShape ? T : never;
}

export namespace MetadataGuards {
  const a = '';
  // to be augmented by supplemental libraries
}