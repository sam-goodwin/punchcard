import { ArrayShape, BinaryShape, BoolShape, ClassShape, ClassType, DynamicShape, IntegerShape, MapShape, Meta, NothingShape, NumberShape, SetShape, StringShape, TimestampShape } from '@punchcard/shape';
import { Value } from '@punchcard/shape-runtime';
import { Shape } from '@punchcard/shape/lib/shape';
import { Visitor as ShapeVisitor } from '@punchcard/shape/lib/visitor';

export interface ValidationErrors extends Array<Error> {}

export type Validator<T> = (value: T, path: string) => ValidationErrors;

export interface ValidationMetadata<T extends Shape> {
  validator: Array<Validator<Value.Of<T>>>;
}

export function MakeValidator<T extends Shape>(validator: Validator<Value.Of<T>>): ValidationMetadata<T> {
  return {
    validator: [validator]
  };
}

export namespace Validator {
  export function of<T extends ClassType | Shape>(type: T): Validator<Value.Of<T>> {
    const shape = Shape.of(type);
    const decoratedValidators =  (Meta.get(shape, ['validator']) || {}).validator || [];

    const validators = decoratedValidators.concat((shape as any).visit(visitor, '$'));

    return (a: any, path) => validators
      .map((v: Validator<any>) => v(a, path))
      .reduce((a: any[], b: any[]) => a.concat(b), []);
  }

  class Visitor implements ShapeVisitor<Array<Validator<any>>, string> {
    public nothingShape(shape: NothingShape, context: string): Array<Validator<any>> {
      return [];
    }
    public dynamicShape(shape: DynamicShape<any>): Array<Validator<any>> {
      return [];
    }
    public arrayShape(shape: ArrayShape<any>): Array<Validator<any>> {
      const validateItem = of(shape.Items);
      return [(arr: any[], path: string) => arr.map((item, i) => validateItem(item, `${path}[${i}]`) as any[]).reduce((a: any[], b: any[]) => a.concat(b), [])];
    }
    public binaryShape(shape: BinaryShape): Array<Validator<any>> {
      return [];
    }
    public boolShape(shape: BoolShape): Array<Validator<any>> {
      return [];
    }
    public classShape(shape: ClassShape<any>): Array<Validator<any>> {
      const validators: {
        [key: string]: Array<Validator<any>>;
      } = {};
      for (const member of Object.values(shape.Members)) {
        validators[member.Name] = [of(member.Type) as any];
      }
      return [(obj, path) => {
        return Object.entries(validators)
          .map(([name, vs]) => vs
            .map((v: Validator<any>) => v(obj[name], `${path}['${name}']`))
            .reduce((a: any[], b: any[]) => a.concat(b), []))
          .reduce((a: any[], b: any[]) => a.concat(b), []);
      }];
    }
    public mapShape(shape: MapShape<any>): Array<Validator<any>> {
      const item = of(shape.Items);
      return [(arr: {[key: string]: any}, path) => Object
        .values(arr)
        .map(key => item(key, `${path}['${key}']`) as any[])
        .reduce((a: any[], b: any[]) => a.concat(b), [])];
    }
    public numberShape(shape: NumberShape): Array<Validator<any>> {
      return [];
    }
    public integerShape(shape: IntegerShape, context: string): Array<Validator<any>> {
      return [(v: number) => v % 1 === 0 ? [] : [new Error(`integers must be whole numbers, but got: ${v}`)]];
    }
    public setShape(shape: SetShape<any>): Array<Validator<any>> {
      const item = of(shape.Items);
      return [(set: Set<any>, path) => Array.from(set).map(i => item(i, `${path}['${path}']`) as any[]).reduce((a: any[], b: any[]) => a.concat(b), [])];
    }
    public stringShape(shape: StringShape): Array<Validator<any>> {
      return [];
    }
    public timestampShape(shape: TimestampShape): Array<Validator<any>> {
      return [];
    }
  }
  const visitor = new Visitor();
}
