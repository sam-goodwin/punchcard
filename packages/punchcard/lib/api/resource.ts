import { NumericShape, RecordType, ShapeOrRecord, StringShape } from '@punchcard/shape';
import { RowLacks } from '@punchcard/shape/node_modules/typelevel-ts';
import { Errors, Operation, OperationBuilder } from './operation';

export interface Identifiers {
  [id: string]: StringShape | NumericShape;
}

export interface ResourceProps<N extends string, I extends Identifiers> {
  name: N;
  identifiers: I;
}

export class Resource<ParentIds extends Identifiers, I extends Identifiers> {
  constructor(public readonly path: string[], public readonly identifiers: I) {}

  public addChild<N extends string, I2 extends Identifiers>(props: ResourceProps<N, RowLacks<I2, keyof I>>): Resource<I, I2> {
    return new Resource([...this.path, props.name], {
      ...this.identifiers,
      ...props.identifiers
    }) as any;
  }

  public onGet<T extends RecordType<any, {[id in keyof I]: I[id]; }>, U extends ShapeOrRecord, E extends Errors | undefined>(
      integration: (builder: OperationBuilder) => OperationBuilder.Output<T, U, E>):
        Operation<T, U, E> {
    return null as any;
  }

  public onCreate<T extends RecordType<any, {[id in keyof ParentIds]: ParentIds[id]; }>, U extends ShapeOrRecord, E extends Errors | undefined>(
    integration: (builder: OperationBuilder) => OperationBuilder.Output<T, U, E>):
      Operation<T, U, E> {
    return null as any;
  }

  public onUpdate<T extends RecordType<any, {[id in keyof (ParentIds & I)]: (ParentIds & I)[id]; }>, U extends ShapeOrRecord, E extends Errors | undefined>(
    integration: (builder: OperationBuilder) => OperationBuilder.Output<T, U, E>):
      Operation<T, U, E> {
    return null as any;
  }

  public onList<T extends RecordType, U extends ShapeOrRecord, E extends Errors | undefined>(
    integration: (builder: OperationBuilder) => OperationBuilder.Output<T, U, E>):
      Operation<T, U, E> {

    return null as any;
  }
}