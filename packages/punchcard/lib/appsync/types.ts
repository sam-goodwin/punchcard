import { ArrayShape, BinaryShape, BoolShape, DynamicShape, IntegerShape, MapShape, NothingShape, NumberShape, RecordMembers, RecordShape, RecordType, SetShape, Shape, string, StringShape, TimestampShape, Trait, Value } from '@punchcard/shape';

import { Record as MakeRecord, ShapeVisitor } from '@punchcard/shape';

const IDTrait: {
  [Trait.Data]: {
    graphqlType: 'ID'
  }
} = {
  [Trait.Data]: {
    graphqlType: 'ID'
  }
};

export const ID = string.apply(IDTrait);

export function GraphQLResolver<M extends RecordMembers>(members: M): {
  Record: RecordType<M>;
  Shape: RecordType<M>;
} & (new() => {}) {
  const record = MakeRecord(members);
  return class NewType {
    public static readonly Record = record;
    public static readonly Shape = record;
  };
}

export namespace GraphQL {

  export function of<T extends Shape>(type: T): TypeOf<T> {
    throw new Error('todo');
  }

  export type Repr<T extends Shape> = (
    T extends ArrayShape<infer I> ? TypeOf<T> | Repr<I>[] :
    T extends MapShape<infer I> ? TypeOf<T> | {
      [key: string]: Repr<I>;
    } :
    T extends RecordShape<infer M> ? TypeOf<T> | {
      [m in keyof M]: Repr<Shape.Resolve<M[m]>>;
    } :
    TypeOf<T>
  );

  // tslint:disable: ban-types
  // cool - we can use recursion now
  export type TypeOf<T extends Shape> =
    T extends BoolShape ? Bool :
    T extends DynamicShape<any> ? Any :
    T extends IntegerShape ? Integer :
    T extends NumberShape ? Integer :
    T extends StringShape ? String :

    T extends ArrayShape<infer I> ? List<TypeOf<I>> :
    T extends MapShape<infer I> ? Map<TypeOf<I>> :
    T extends RecordShape<infer M> ? GraphQL.Record<{
      [m in keyof M]: TypeOf<Shape.Resolve<M[m]>>;
    }> & {
      [m in keyof M]: TypeOf<Shape.Resolve<M[m]>>;
    } :
    Type<T>
    ;

  export type ShapeOf<T extends Type> = T extends Type<infer I> ? I : never;


  // export const Shape = Symbol.for('GraphQL.Shape');
  export const type = Symbol.for('GraphQL.Type');
  const expression = Symbol.for('GraphQL.Expression');
  export class Type<T extends Shape = any> {
    public readonly [type]: T;
    constructor(shape: T, expression: GraphQL.Expression) {
      this[type] = shape;
    }
  }
  export class Nothing extends Type<NothingShape> {}
  export class Any extends Type<DynamicShape<any>> {}
  export class Bool extends Type<BoolShape> {}
  export class Integer extends Type<IntegerShape> {}
  export class Number extends Type<NumberShape> {}
  export class String extends Type<StringShape> {}
  export class Binary extends Type<BinaryShape> {}
  export class List<T extends Type = any> extends Type<ArrayShape<ShapeOf<T>>> {
    constructor(shape: ArrayShape<ShapeOf<T>>, expression: GraphQL.Expression) {
      super(shape, expression);

    }
  }
  export class Map<T extends Type = any> extends Type<MapShape<ShapeOf<T>>> {}
  export class Record<M extends { [m: string]: Type; } = any> extends Type<RecordShape<{
    [m in keyof M]: ShapeOf<M[m]>;
  }>> {}
  export namespace Record {
    export type GetMembers<R extends Record> = R extends Record<infer M> ? M : any;
  }
  export type RecordClass<T extends Record = any> = (new(members: Record.GetMembers<T>) => T);
}

export namespace GraphQL {
  export declare function string(s: string): GraphQL.String;
  export declare function number(n: number): GraphQL.Number;
  export declare function isNull(value: GraphQL.Type): GraphQL.Bool;
}

export namespace GraphQL {
  export interface StaticInterface<M extends RecordMembers> {
    readonly members: M;
    /**
     * Value of this type at runtime in a Lambda Function or Container.
     */
    readonly Record: RecordShape<M>;
  }

  export interface InstanceInterface {
    // todo
  }

  export function NewType<M extends RecordMembers>(members: M): StaticInterface<M> & (new(values: {
    [m in keyof M]: TypeOf<Shape.Resolve<M[m]>>;
  }) => Record<{
    readonly [m in keyof M]: TypeOf<Shape.Resolve<M[m]>>;
  }> & {
    readonly [m in keyof M]: TypeOf<Shape.Resolve<M[m]>>;
  } & InstanceInterface) {
    return null as any;
  }
}
export namespace GraphQL {
  export interface Expression {
    /**
     * Write the Expression to VTL.
     */
    toVTL(): string;
  }
}

export namespace GraphQL {
  export class Visitor implements ShapeVisitor<GraphQL.Type, GraphQL.Expression> {
    public arrayShape(shape: ArrayShape<any>, expr: Expression): List {
      return new List(shape, expr);
    }
    public binaryShape(shape: BinaryShape, expr: Expression): Type<any> {
      return new Binary(shape, expr);
    }
    public boolShape(shape: BoolShape, expr: Expression): Type<any> {
      return new Bool(shape, expr);
    }
    public recordShape(shape: RecordShape<any>, expr: Expression): Type<any> {
      return new Record(shape, expr);
    }
    public dynamicShape(shape: DynamicShape<any>, expr: Expression): Type<any> {
      return new Any(shape, expr);
    }
    public integerShape(shape: IntegerShape, expr: Expression): Type<any> {
      return new Integer(shape, expr);
    }
    public mapShape(shape: MapShape<any>, expr: Expression): Type<any> {
      return new Map(shape, expr);
    }
    public nothingShape(shape: NothingShape, expr: Expression): Type<any> {
      throw new Error("Method not implemented.");
    }
    public numberShape(shape: NumberShape, expr: Expression): Type<any> {
      throw new Error("Method not implemented.");
    }
    public setShape(shape: SetShape<any>, expr: Expression): Type<any> {
      throw new Error("Method not implemented.");
    }
    public stringShape(shape: StringShape, expr: Expression): Type<any> {
      throw new Error("Method not implemented.");
    }
    public timestampShape(shape: TimestampShape, expr: Expression): Type<any> {
      throw new Error("Method not implemented.");
    }
  }
}
