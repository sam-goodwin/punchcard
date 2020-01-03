import { ArrayShape } from '../array';
import { BinaryShape } from '../binary';
import { BooleanShape } from '../boolean';
import { DynamicShape } from '../dynamic';
import { ClassType } from '../instance';
import { MapShape } from '../map';
import { DoubleShape, FloatShape, IntegerShape, LongShape } from '../number';
import { OptionalShape } from '../optional';
import { SetShape } from '../set';
import { Shape } from '../shape';
import { StringShape } from '../string';
import { struct, StructShape } from '../struct';
import { TimestampShape } from '../timestamp';






export interface ShapeVisitor {
  array(shape: ArrayShape<any>): void;
  binary(shape: BinaryShape): void;
  boolean(shape: BooleanShape): void;
  double(shape: DoubleShape): void;
  dynamic(shape: DynamicShape<any>): void;
  float(shape: FloatShape): void;
  integer(shape: IntegerShape): void;
  long(shape: LongShape): void;
  map(shape: MapShape<any>): void;
  optional(shape: OptionalShape<any>): void;
  set(shape: SetShape<any>): void;
  string(shape: StringShape): void;
  struct(shape: StructShape<any>): void;
  timestamp(shape: TimestampShape): void;
}
export namespace ShapeVisitor {
  export class Default implements ShapeVisitor {
    constructor(private readonly visitor: Partial<ShapeVisitor>) {}

    public array(shape: ArrayShape<any>): void {
      if (this.visitor.array) {
        this.visitor.array(shape);
      }
    }
    public binary(shape: BinaryShape): void {
      if (this.visitor.binary) {
        this.visitor.binary(shape);
      }
    }
    public boolean(shape: BooleanShape): void {
      if (this.visitor.boolean) {
        this.visitor.boolean(shape);
      }
    }
    public double(shape: DoubleShape): void {
      if (this.visitor.double) {
        this.visitor.double(shape);
      }
    }
    public dynamic(shape: DynamicShape<any>): void {
      if (this.visitor.dynamic) {
        this.visitor.dynamic(shape);
      }
    }
    public float(shape: FloatShape): void {
      if (this.visitor.float) {
        this.visitor.float(shape);
      }
    }
    public integer(shape: IntegerShape): void {
      if (this.visitor.integer) {
        this.visitor.integer(shape);
      }
    }
    public long(shape: LongShape): void {
      if (this.visitor.long) {
        this.visitor.long(shape);
      }
    }
    public map(shape: MapShape<any>): void {
      if (this.visitor.map) {
        this.visitor.map(shape);
      }
    }
    public optional(shape: OptionalShape<any>): void {
      if (this.visitor.optional) {
        this.visitor.optional(shape);
      }
    }
    public set(shape: SetShape<any>): void {
      if (this.visitor.set) {
        this.visitor.set(shape);
      }
    }
    public string(shape: StringShape): void {
      if (this.visitor.string) {
        this.visitor.string(shape);
      }
    }
    public struct(shape: StructShape<any>): void {
      if (this.visitor.struct) {
        this.visitor.struct(shape);
      }
    }
    public timestamp(shape: TimestampShape): void {
      if (this.visitor.timestamp) {
        this.visitor.timestamp(shape);
      }
    }
  }
}

export function walk<T>(type: ClassType<T>, visitor: ShapeVisitor) {
  _walk(struct(type), visitor, new WeakSet());
}

function _walk(shape: Shape, visitor: ShapeVisitor, seen: WeakSet<Shape>): void {
  if (!seen.has(shape)) {
    seen.add(shape);
    shape.visit(visitor);
    if (StructShape.isStruct(shape)) {
      for (const [name, propertyType] of Object.entries(shape.type)) {
        
      }
    }
  }
}
