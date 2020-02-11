import { ShapeOrRecord } from '@punchcard/shape';
import { VTL } from '@punchcard/shape-velocity-template';
import { Errors, Operation, OperationBuilder } from './operation';
import { Identifiers, Resource, ResourceProps } from './resource';

export interface ServiceProps {
  serviceName: string;
}
// tslint:disable: ban-types
export class Service {
  public readonly serviceName: string;

  constructor(props: ServiceProps) {
    this.serviceName = props.serviceName;
  }

  public addChild<N extends string, I extends Identifiers>(props: ResourceProps<N, I>): Resource<{}, I> {
    return new Resource([props.name], props.identifiers);
  }

  public addOperation<I extends ShapeOrRecord, T extends ShapeOrRecord, U extends ShapeOrRecord, E extends Errors>(
    props: {
      name: string;
      input: I;
    },
    integration: (value: VTL.DSL<I>) => OperationBuilder.Output<T, U, E>):
      Operation<T, U, E> {
    return null as any;
  }
}