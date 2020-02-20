import { NumericShape, RecordType, ShapeOrRecord, StringShape } from '@punchcard/shape';
import VTL = require('@punchcard/shape-velocity-template');
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

  public onGet<T extends RecordType<any, {[id in keyof I]: I[id]; }>, U extends VTL.Object, E extends Errors | undefined>(
    requestType: T, integration: (builder: VTL.DSL<T>) => U):
        Operation<T, VTL.Object.Shape<U>, E> {
    return null as any;
  }

  public onCreate<T extends RecordType<any, {[id in keyof ParentIds]: ParentIds[id]; }>, U extends VTL.Object, E extends Errors | undefined>(
    requestType: T, integration: (request: VTL.DSL<T>) => U):
      Operation<T, VTL.Object.Shape<U>, E> {
    return null as any;
  }

  public onUpdate<T extends RecordType<any, {[id in keyof (ParentIds & I)]: (ParentIds & I)[id]; }>, U extends VTL.Object, E extends Errors | undefined>(
    requestType: T, integration: (builder: VTL.DSL<T>) => U):
      Operation<T, VTL.Object.Shape<U>, E> {
    return null as any;
  }

  public onList<T extends RecordType, U extends VTL.Object, E extends Errors | undefined>(
    requestType: T, integration: (builder: VTL.DSL<T>) => U):
      Operation<T, VTL.Object.Shape<U>, E> {

    return null as any;
  }
}
