import { RecordType, ShapeOrRecord } from '@punchcard/shape';
import VTL = require('@punchcard/shape-velocity-template');

import { Input } from './input';
import { Errors, Integration, Operation } from './operation';
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

  public addResource<N extends string, I extends Identifiers>(props: ResourceProps<N, I>): Resource<{}, I> {
    return new Resource([props.name], props.identifiers);
  }

  public addOperation<
    T extends RecordType,
    U extends RecordType,
    E extends Errors | undefined,
    P extends Array<keyof T['members']> | undefined
  >(name: string,
    props: OperationProps<T, U, E, P>,
    integration: (request: Input<any, T>) => VTL.DSL<U>) {

    return null as any;
  }
}

interface OperationProps<
  Input extends RecordType,
  Output extends RecordType,
  Exceptions extends Errors | undefined,
  Parameters extends Array<keyof Input['members']> | undefined
> {
  input: Input;
  output: Output;
  errors?: Exceptions;
  params?: Parameters;
}
