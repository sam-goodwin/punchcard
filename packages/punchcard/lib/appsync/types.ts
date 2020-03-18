import { ArrayShape, BinaryShape, bool, BoolShape, DynamicShape, IntegerShape, MapShape, NothingShape, NumberShape, RecordMembers, RecordShape, RecordType, SetShape, Shape, string, StringShape, TimestampShape, Trait } from '@punchcard/shape';
import { Construct } from '../core/construct';

import { Record as MakeRecord, ShapeVisitor } from '@punchcard/shape';
import { $api, Resolver } from './resolver/resolver';

// tslint:disable: no-construct

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
} & Construct.Class<Construct & {
  Shape: RecordType<M>;
  $: GraphQL.TypeOf<RecordType<M>>;
  $field: <T extends Shape.Like>(type: T) => Resolver<{}, Shape.Resolve<T>>;
}> {
  const record = MakeRecord(members);
  return class NewType extends Construct {
    public static readonly Record = record;

    public readonly Shape = record;

    /**
     * A reference to `$context.source` as "this".
     */
    public readonly $this = GraphQL.of(record, new GraphQL.ReferenceExpression('$context.source'));
    public readonly $ = this.$this;

    public $field<T extends Shape.Like>(type: T): Resolver<{}, Shape.Resolve<T>> {
      return $api({}, type);
    }
  };
}

export namespace GraphQL {
  export function of<T extends Shape>(type: T, expr: GraphQL.Expression): TypeOf<T> {
    return type.visit(GraphQL.visitor as any, expr) as any;
  }

  export function clone<T extends GraphQL.Type>(t: T, expr: GraphQL.Expression): T {
    return of(t[type], expr) as any;
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
  export type TypeOf<T extends Shape.Like> =
    Shape.Resolve<T> extends BoolShape ? Bool :
    Shape.Resolve<T> extends DynamicShape<any> ? Any :
    Shape.Resolve<T> extends IntegerShape ? Integer :
    Shape.Resolve<T> extends NumberShape ? Integer :
    Shape.Resolve<T> extends StringShape ? String :

    Shape.Resolve<T> extends ArrayShape<infer I> ? List<TypeOf<I>> :
    Shape.Resolve<T> extends MapShape<infer I> ? Map<TypeOf<I>> :
    Shape.Resolve<T> extends RecordShape<infer M> ? GraphQL.Record<{
      [m in keyof M]: TypeOf<Shape.Resolve<M[m]>>;
    }> & {
      [m in keyof M]: TypeOf<Shape.Resolve<M[m]>>;
    } :
    Type<Shape.Resolve<T>>
    ;

  export type ShapeOf<T extends Type> = T extends Type<infer I> ? I : never;

  // export const Shape = Symbol.for('GraphQL.Shape');
  export const type = Symbol.for('GraphQL.Type');
  export const expr = Symbol.for('GraphQL.Expression');
  export class Type<T extends Shape = any> {
    public readonly [type]: T;
    public readonly [expr]: GraphQL.Expression;
    constructor(_type: T, _expr: GraphQL.Expression) {
      this[type] = _type;
      this[expr] = _expr;
    }
  }
  export class Nothing extends Type<NothingShape> {}
  export class Any extends Type<DynamicShape<any>> {}
  export class Bool extends Type<BoolShape> {
    public static not(a: Bool): Bool {
      return new Bool(bool, a[expr].prepend('!'));
    }
  }
  export class Integer extends Type<IntegerShape> {}
  export class Number extends Type<NumberShape> {}
  export class String extends Type<StringShape> {
    public toUpperCase(): String {
      return new String(this[type], this[expr].dot('toUpperCase()'));
    }

    public isNotEmpty(): Bool {
      return Bool.not(this.isEmpty());
    }

    public isEmpty(): Bool {
      return new Bool(bool, this[expr].dot('isEmpty()'));
    }
  }
  export class Timestamp extends Type<TimestampShape> {}
  export class Binary extends Type<BinaryShape> {}
  export class List<T extends Type = any> extends Type<ArrayShape<ShapeOf<T>>> {
    constructor(shape: ArrayShape<ShapeOf<T>>, expression: GraphQL.Expression) {
      super(shape, expression);
    }
  }
  export class Set<T extends Type = any> extends Type<SetShape<ShapeOf<T>>> {
    constructor(shape: SetShape<ShapeOf<T>>, expression: GraphQL.Expression) {
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
  export abstract class Expression {
    public dot(text: string): Expression {
      return new ReferenceExpression(`${this.toVTL()}.${text}`);
    }

    public prepend(text: string): Expression {
      return new ReferenceExpression(`${text}${this.toVTL()}`);
    }

    public surround(left: string, right: string = ''): Expression {
      return new ReferenceExpression(`${left}${this.toVTL()}${right}`);
    }

    /**
     * Write the Expression to VTL.
     */
    public abstract toVTL(): string;
  }

  export class ReferenceExpression extends Expression {
    constructor(public readonly reference: string) {
      super();
    }
    public toVTL = () => this.reference;
  }
}

export namespace GraphQL {
  export class Visitor implements ShapeVisitor<GraphQL.Type, GraphQL.Expression> {
    public arrayShape(shape: ArrayShape<any>, expr: Expression): List {
      return new List(shape, expr);
    }
    public binaryShape(shape: BinaryShape, expr: Expression): Binary {
      return new Binary(shape, expr);
    }
    public boolShape(shape: BoolShape, expr: Expression): Bool {
      return new Bool(shape, expr);
    }
    public recordShape(shape: RecordShape<any>, expr: Expression): Record {
      return new Record(shape, expr);
    }
    public dynamicShape(shape: DynamicShape<any>, expr: Expression): Any {
      return new Any(shape, expr);
    }
    public integerShape(shape: IntegerShape, expr: Expression): Integer {
      return new Integer(shape, expr);
    }
    public mapShape(shape: MapShape<Shape>, expr: Expression): Map<GraphQL.Type> {
      return new Map(shape, expr);
    }
    public nothingShape(shape: NothingShape, expr: Expression): Nothing {
      throw new Nothing(shape, expr);
    }
    public numberShape(shape: NumberShape, expr: Expression): Number {
      // tslint:disable-next-line: no-construct
      return new Number(shape, expr);
    }
    public setShape(shape: SetShape<Shape>, expr: Expression): Set<GraphQL.Type> {
      return new Set(shape, expr);
    }
    public stringShape(shape: StringShape, expr: Expression): String {
      // tslint:disable-next-line: no-construct
      return new String(shape, expr);
    }
    public timestampShape(shape: TimestampShape, expr: Expression): Timestamp {
      return new Timestamp(shape, expr);
    }
  }
  export const visitor = new Visitor();
}
