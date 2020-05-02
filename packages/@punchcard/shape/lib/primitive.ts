import { ShapeGuards } from './guards';
import { Decorated, Trait } from './metadata';
import { Shape } from './shape';

export type PrimitiveShapes =
  | AnyShape
  | BoolShape
  | StringShape
  | NumberShape
  | IntegerShape
  | TimestampShape
  | NothingShape
  ;

export class AnyShape extends Shape {
  public readonly Kind: 'anyShape' = 'anyShape';
  public readonly FQN: 'punchcard.any' = 'punchcard.any';

  public equals<O extends Shape>(other: O): this is O {
    return ShapeGuards.isAnyShape(other);
  }
  public hashCode(): number {
    return 0;
  }
}

export class BinaryShape extends Shape {
  public readonly Kind: 'binaryShape' = 'binaryShape';
  public readonly FQN: 'binary' = 'binary';
}

export class BoolShape extends Shape {
  public readonly Kind: 'boolShape' = 'boolShape';
  public readonly FQN: 'bool' = 'bool';
}

export class StringShape extends Shape {
  public readonly Kind: 'stringShape' = 'stringShape';
  public readonly FQN: 'string' = 'string';
}

export class NumberShape extends Shape {
  public readonly isNumeric: true = true;
  public readonly Kind: 'numberShape' = 'numberShape';
  public readonly FQN: 'number' = 'number';
}
export namespace NumberShape {
  export function type<T extends string>(numberType: T) {
    return number.apply({
      [Trait.Data]: {
        numberType
      }
    });
  }
  export interface Type<T extends string> {
    [Trait.Data]: {
      numberType: T
    }
  }
}

export class IntegerShape extends NumberShape {
  public readonly [Decorated.Data]? = {
    numberType: 'integer'
  } as const;
}

export class TimestampShape extends Shape {
  public readonly Kind: 'timestampShape' = 'timestampShape';
  public readonly FQN: 'timestamp' = 'timestamp';

  public equals<O extends Shape>(other: O): this is O {
    return ShapeGuards.isBinaryShape(other);
  }
}

export class NothingShape extends Shape {
  public readonly Kind: 'nothingShape' = 'nothingShape';
  public readonly FQN: 'nothing' = 'nothing';
}

export class NeverShape extends Shape {
  public readonly Kind: 'neverShape' = 'neverShape';
  public readonly FQN: 'never' = 'never';
}

export const never = new NeverShape();
export const nothing = new NothingShape();
export const any = new AnyShape();

export const binary = new BinaryShape();
export const bool = new BoolShape();
export const boolean = bool;
export const string = new StringShape();
export const number = new NumberShape();
export const int = new IntegerShape();
export const integer = int;
export const timestamp = new TimestampShape();
