import {$api, Resolver} from "./intepreter/resolver";
import {
  ArrayShape,
  BinaryShape,
  BoolShape,
  DynamicShape,
  IntegerShape,
  MapShape,
  NothingShape,
  NumberShape,
  RecordMembers,
  RecordShape,
  RecordType,
  SetShape,
  Shape,
  ShapeGuards,
  StringShape,
  TimestampShape,
  Trait,
  bool,
  integer,
} from "@punchcard/shape";
import {Record as MakeRecord, ShapeVisitor} from "@punchcard/shape";
import {
  integer as integerShape,
  number as numberShape,
  string as stringShape,
} from "@punchcard/shape";
import {Construct} from "../core/construct";
import {Frame} from "./intepreter/frame";
import {Util} from "./util";

const IDTrait: {
  [Trait.Data]: {
    graphqlType: "ID";
  };
} = {
  [Trait.Data]: {
    graphqlType: "ID",
  },
};

export const ID = stringShape.apply(IDTrait);

export function GraphQLResolver<M extends RecordMembers>(
  members: M,
): {
  Record: RecordType<M>;
} & Construct.Class<
  Construct & {
    $: GraphQL.TypeOf<RecordType<M>>;
    $field: <T extends Shape.Like>(type: T) => Resolver<{}, Shape.Resolve<T>>;
    Shape: RecordType<M>;
  }
> {
  const record = MakeRecord(members);
  return class NewType extends Construct {
    public static readonly Record = record;

    public readonly Shape = record;

    /**
     * A reference to `$context.source` as "this".
     */
    public readonly $this = GraphQL.of(
      record,
      new GraphQL.Expression("$context.source"),
    );
    public readonly $ = this.$this;

    public $field<T extends Shape.Like>(
      type: T,
    ): Resolver<{}, Shape.Resolve<T>> {
      return $api({}, type);
    }
  };
}

export namespace GraphQL {
  export function of<T extends Shape>(
    type: T,
    expr: GraphQL.Expression,
  ): TypeOf<T> {
    return type.visit(GraphQL.visitor as any, expr);
  }

  export function clone<T extends GraphQL.Type>(
    t: T,
    expr: GraphQL.Expression,
  ): T {
    return of(t[type], expr) as any;
  }

  export type Repr<T extends Shape> = T extends ArrayShape<infer I>
    ? TypeOf<T> | Repr<I>[]
    : T extends MapShape<infer I>
    ?
        | TypeOf<T>
        | {
            [key: string]: Repr<I>;
          }
    : T extends RecordShape<infer M>
    ?
        | TypeOf<T>
        | {
            [m in keyof M]: Repr<Shape.Resolve<M[m]>>;
          }
    : TypeOf<T>;

  // cool - we can use recursion now
  export type TypeOf<T extends Shape.Like> = Shape.Resolve<T> extends BoolShape
    ? Bool
    : Shape.Resolve<T> extends DynamicShape<any>
    ? Any
    : Shape.Resolve<T> extends IntegerShape
    ? Integer
    : Shape.Resolve<T> extends NumberShape
    ? Integer
    : Shape.Resolve<T> extends StringShape
    ? GraphQL.String
    : Shape.Resolve<T> extends ArrayShape<infer I>
    ? List<TypeOf<I>>
    : Shape.Resolve<T> extends MapShape<infer I>
    ? Map<TypeOf<I>>
    : Shape.Resolve<T> extends RecordShape<infer M>
    ? GraphQL.Record<
        {
          [m in keyof M]: TypeOf<Shape.Resolve<M[m]>>;
        }
      > &
        {
          [m in keyof M]: TypeOf<Shape.Resolve<M[m]>>;
        }
    : Type<Shape.Resolve<T>>;

  export type ShapeOf<T extends Type> = T extends Type<infer I> ? I : never;

  // export const Shape = Symbol.for('GraphQL.Shape');
  export const type = Symbol.for("GraphQL.Type");
  export const expr = Symbol.for("GraphQL.Expression");
  export class Type<T extends Shape = Shape> {
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
      return new Bool(bool, a[expr].prepend("!"));
    }
  }
  export class Integer extends Type<IntegerShape> {}
  export class Number extends Type<NumberShape> {}
  export class String extends Type<StringShape> {
    public toUpperCase(): GraphQL.String {
      return new String(this[type], this[expr].dot("toUpperCase()"));
    }

    public isNotEmpty(): Bool {
      return Bool.not(this.isEmpty());
    }

    public isEmpty(): Bool {
      return new Bool(bool, this[expr].dot("isEmpty()"));
    }

    public size(): Integer {
      return new Integer(integer, this[expr].dot("size()"));
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
  export class Record<M extends {[m: string]: Type} = any> extends Type<
    RecordShape<
      {
        [m in keyof M]: ShapeOf<M[m]>;
      }
    >
  > {}

  export namespace Record {
    export type GetMembers<R extends Record> = R extends Record<infer M>
      ? M
      : any;
  }
  export type RecordClass<T extends Record = any> = new (
    members: Record.GetMembers<T>,
  ) => T;
}

export namespace GraphQL {
  /**
   * https://docs.aws.amazon.com/appsync/latest/devguide/resolver-util-reference.html
   */
  export const $util = new Util();

  /**
   * Type of an ExpressionTemplate factory.
   *
   * ```ts
   * GraphQL.string`${mustBeAGraphQLType}`;
   * ```
   */
  export type ExpressionTemplate<T extends Shape> = <
    Args extends GraphQL.Type[]
  >(
    template: TemplateStringsArray,
    ...args: Args
  ) => GraphQL.TypeOf<T>;

  export const $ = template;

  /**
   * Evaluate a string template as a shape.
   *
   * ```ts
   * const str = GraphQL.template(string)`hello`;
   *
   * // short-hand
   * const str = GraphQL.$(string)`hello`;
   * ```
   *
   * @param type - todo: add description
   */
  export function template<T extends Shape>(
    type: Shape,
  ): ExpressionTemplate<T> {
    return (template, ...args): GraphQL.TypeOf<T> => {
      return GraphQL.of(
        type,
        new GraphQL.Expression((frame) => {
          // return null as any;
          template.forEach((str, i) => {
            frame.print(str);
            if (i < args.length) {
              frame.interpret(args[i]);
            }
          });
        }),
      ) as GraphQL.TypeOf<T>;
    };
  }

  export function string<Args extends GraphQL.Type[]>(
    template: TemplateStringsArray,
    ...args: Args
  ): GraphQL.String;
  export function string(s: string): GraphQL.String;
  export function string(...args: any[]): GraphQL.String {
    if (typeof args[0] === "string") {
      return new GraphQL.String(
        stringShape,
        new GraphQL.VolatileExpression(stringShape, args[0]),
      );
    } else {
      return ($(stringShape) as any)(...args);
    }
  }

  export function number<Args extends GraphQL.Type[]>(
    template: TemplateStringsArray,
    ...args: Args
  ): GraphQL.Number;
  export function number(n: number): GraphQL.Number;
  export function number(...args: any[]): GraphQL.Number {
    if (typeof args[0] === "number") {
      return new GraphQL.Number(
        numberShape,
        new GraphQL.VolatileExpression(integerShape, args[0].toString(10)),
      );
    } else {
      return ($(stringShape) as any)(...args);
    }
  }
}

export namespace GraphQL {
  export interface StaticInterface<M extends RecordMembers> {
    /**
     * Value of this type at runtime in a Lambda Function or Container.
     */
    readonly Record: RecordShape<M>;
    readonly members: M;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface InstanceInterface {
    // todo
  }

  export function NewType<M extends RecordMembers>(
    _members: M,
  ): StaticInterface<M> &
    (new (
      values: {
        [m in keyof M]: TypeOf<Shape.Resolve<M[m]>>;
      },
    ) => Record<
      {
        readonly [m in keyof M]: TypeOf<Shape.Resolve<M[m]>>;
      }
    > &
      {
        readonly [m in keyof M]: TypeOf<Shape.Resolve<M[m]>>;
      } &
      InstanceInterface) {
    // todo: find way around needing this casting
    return undefined as any;
  }
}

export namespace GraphQL {
  export class Expression {
    private readonly text: (ctx: Frame) => void;

    constructor(text: string | ((ctx: Frame) => void)) {
      if (typeof text === "string") {
        this.text = (ctx): void => ctx.print(text);
      } else {
        this.text = text;
      }
    }

    /**
     * Write the Expression to VTL.
     */
    public visit(ctx: Frame): void {
      this.text(ctx);
    }

    public dot(text: string): Expression {
      return new Expression((ctx) => {
        this.visit(ctx);
        ctx.print(".");
        ctx.print(text);
      });
    }

    public prepend(text: string): Expression {
      return new Expression((ctx) => {
        ctx.print(text);
        this.visit(ctx);
      });
    }

    public surround(left: string, right = ""): Expression {
      return new Expression((ctx) => {
        ctx.print(left);
        this.visit(ctx);
        ctx.print(right);
      });
    }
  }

  /**
   * Volatile expressions can not be indexed - they must be stored as a variable before being referenced.
   */
  export class VolatileExpression<T extends Shape = Shape> extends Expression {
    constructor(
      public readonly type: T,
      text: string | ((ctx: Frame) => void),
    ) {
      super(text);
    }

    public visit(frame: Frame): void {
      let name = frame.lookup(this);

      if (!name) {
        name = frame.register(this);
        const vars = frame.variables;

        name = vars.getNewId();
        vars.print(`#set($${name} = `);
        vars.print(`"`);
        if (ShapeGuards.isStringShape(this.type)) {
          // strings are enclosed in '' to escape their content.
          vars.print(`'`);
        }
        super.visit(vars);
        if (ShapeGuards.isStringShape(this.type)) {
          vars.print(`'`);
        }
        vars.printLine(`")`);
      }
      frame.print(`$${name}`);
    }
  }
}

export namespace GraphQL {
  export class Visitor
    implements ShapeVisitor<GraphQL.Type, GraphQL.Expression> {
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
    public mapShape(
      shape: MapShape<Shape>,
      expr: Expression,
    ): Map<GraphQL.Type> {
      return new Map(shape, expr);
    }
    public nothingShape(shape: NothingShape, expr: Expression): Nothing {
      throw new Nothing(shape, expr);
    }
    public numberShape(shape: NumberShape, expr: Expression): GraphQL.Number {
      return new Number(shape, expr);
    }
    public setShape(
      shape: SetShape<Shape>,
      expr: Expression,
    ): Set<GraphQL.Type> {
      return new Set(shape, expr);
    }
    public stringShape(shape: StringShape, expr: Expression): GraphQL.String {
      return new String(shape, expr);
    }
    public timestampShape(shape: TimestampShape, expr: Expression): Timestamp {
      return new Timestamp(shape, expr);
    }
  }
  export const visitor = new Visitor();
}
