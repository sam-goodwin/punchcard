import { ArrayShape, BinaryShape, BoolShape, ClassShape, ClassType, DynamicShape, MapShape, Meta, NumberShape, SetShape, StringShape, TimestampShape } from '@punchcard/shape';
import { Runtime } from '@punchcard/shape-runtime';
import { Shape } from '@punchcard/shape/lib/shape';
import { Visitor as ShapeVisitor } from '@punchcard/shape/lib/visitor';

export interface ValidationErrors extends Array<Error> {}

export type Validator<T> = (value: T) => ValidationErrors;

export interface ValidationMetadata<T extends Shape> {
  validator: Array<Validator<Runtime.Of<T>>>;
}

export function MakeValidator<T extends Shape>(validator: Validator<Runtime.Of<T>>): ValidationMetadata<T> {
  return {
    validator: [validator]
  };
}

export namespace Validator {
  export function of<T extends ClassType | Shape>(type: T): Validator<Runtime.Of<Shape.Of<T>>> {
    const shape = Shape.of(type);
    const decoratedValidators =  (Meta.get(shape, ['validator']) || {}).validator || [];

    const validators = decoratedValidators.concat((shape as any).visit(visitor, null));

    return (a: any) => validators
      .map((v: Validator<any>) => v(a))
      .reduce((a: any[], b: any[]) => a.concat(b), []);
  }

  class Visitor implements ShapeVisitor<Array<Validator<any>>, any> {
    public dynamicShape(shape: DynamicShape<any>, context: any): Array<Validator<any>> {
      return [];
    }
    public arrayShape(shape: ArrayShape<any>, context: any): Array<Validator<any>> {
      const item = of(shape.Items);
      return [(arr: any[]) => arr.map(i => item(i) as any[]).reduce((a: any[], b: any[]) => a.concat(b), [])];
    }
    public binaryShape(shape: BinaryShape, context: any): Array<Validator<any>> {
      return [];
    }
    public boolShape(shape: BoolShape, context: any): Array<Validator<any>> {
      return [];
    }
    public classShape(shape: ClassShape<any>, context: any): Array<Validator<any>> {
      const validators: {
        [key: string]: Array<Validator<any>>;
      } = {};
      for (const member of Object.values(shape.Members)) {
        validators[member.Name] = [of(member.Type) as any];
      }
      return [(obj) => {
        return Object.entries(validators)
          .map(([name, vs]) => vs
            .map((v: any) => v(obj[name]))
            .reduce((a: any[], b: any[]) => a.concat(b), []))
          .reduce((a: any[], b: any[]) => a.concat(b), []);
      }];
    }
    public mapShape(shape: MapShape<any>, context: any): Array<Validator<any>> {
      const item = of(shape.Items);
      return [(arr: {[key: string]: any}) => Object
        .values(arr)
        .map(i => item(i) as any[])
        .reduce((a: any[], b: any[]) => a.concat(b), [])];
    }
    public numberShape(shape: NumberShape, context: any): Array<Validator<any>> {
      return [];
    }
    public setShape(shape: SetShape<any>, context: any): Array<Validator<any>> {
      const item = of(shape.Items);
      return [(set: Set<any>) => Array.from(set).map(i => item(i) as any[]).reduce((a: any[], b: any[]) => a.concat(b), [])];
    }
    public stringShape(shape: StringShape, context: any): Array<Validator<any>> {
      return [];
    }
    public timestampShape(shape: TimestampShape, context: any): Array<Validator<any>> {
      return [];
    }
  }
  const visitor = new Visitor();
}
