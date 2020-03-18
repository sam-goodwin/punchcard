import { Shape, Value } from '@punchcard/shape';
import { Integration, LambdaIntegration, Resource } from '../api-gateway';
import * as CloudWatch from '../cloudwatch';
import { Build } from '../core/build';
import { Client } from '../core/client';
import { Dependency } from '../core/dependency';
import { Function, FunctionOverrideProps, FunctionProps } from './function';
import { schedule, ScheduleProps } from './schedule';

import * as cdk from '@aws-cdk/core';

export interface ExecutorServiceProps extends Omit<FunctionProps<any, any, any>, 'request' | 'response' | 'depends' | 'mapper'> {}

/**
 * Alias for creating a LambdaExecutorService
 * @param props
 */
export function λ(props?: ExecutorServiceProps) {
  return new ExecutorService(props);
}
export const L = λ;

export class ExecutorService {
  constructor(private readonly props: ExecutorServiceProps = {}) {}

  public spawn<T extends Shape.Like, U extends Shape.Like, D extends Dependency<any> = any>(scope: Build<cdk.Construct>, id: string, props: FunctionProps<T, U, D>, handler: (event: Value.Of<Shape.Resolve<T>>, clients: Client<D>, context: any) => Promise<Value.Of<Shape.Resolve<U>>>): Function<T, U, D> {
    return new Function<T, U, D>(scope, id, this.applyDefaultProps(props), handler);
  }

  public schedule<D extends Dependency<any>>(scope: Build<cdk.Construct>, id: string, props: ScheduleProps<D>, handler: (event: CloudWatch.Event.Payload, clients: Client<D>, context: any) => Promise<any>): Function<typeof CloudWatch.Event.Payload, any, D> {
    return schedule(scope, id, this.applyDefaultProps(props), handler);
  }

  private applyDefaultProps<P extends FunctionProps<any, any, any>>(props: P): P {
    if (props.functionProps) {
      props.functionProps = props.functionProps.chain(props =>
        (this.props.functionProps || Build.empty).map(p => ({
          ...p,
          ...props,
        })));
    } else {
      props.functionProps = this.props.functionProps;
    }
    return {
      ...this.props,
      ...props
    };
  }

  public apiIntegration<D extends Dependency<any>>(scope: Build<cdk.Construct>, id: string, props: {
    depends: D;
  }): Integration<D> {
    const handler = this.spawn(scope, id, {
      depends: props.depends
    }, async (event: any, runtimeContext: Client<D>) => {
      const resourceId = event.__resourceId; // TODO: we implicitly know this field exists - magic field. see ../api-gateway/resource.ts
      const resource: Resource = integration.findResource(resourceId);
      if (!resource) {
        throw new Error(`could not resolve resource handler for resourceId: ${resourceId}`);
      }
      return await resource.handle(event, runtimeContext);
    });
    const integration = new LambdaIntegration(handler);
    return integration;
  }
}
