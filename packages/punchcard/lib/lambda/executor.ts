import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/core');

import { Integration, LambdaIntegration, Resource } from '../api-gateway';
import { Client } from '../core/client';
import { Dependency } from '../core/dependency';
import { Omit } from '../util/omit';
import { Function, FunctionProps } from './function';

import * as CloudWatch from '../cloudwatch';
import { Build } from '../core/build';
import { schedule, ScheduleProps } from './schedule';

/**
 * Alias for creating a LambdaExecutorService
 * @param props
 */
export function λ(props?: Omit<lambda.FunctionProps, 'runtime' | 'code' | 'handler'>) {
  return new ExecutorService(props);
}
export const L = λ;

export class ExecutorService {
  constructor(private readonly props: Omit<lambda.FunctionProps, 'runtime' | 'code' | 'handler'> = {
    memorySize: 128
  }) {}

  public spawn<T, U, D extends Dependency<any>>(scope: Build<cdk.Construct>, id: string, props: FunctionProps<T, U, D>, handler: (event: T, clients: Client<D>, context: any) => Promise<U>): Function<T, U, D> {
    return new Function<T, U, D>(scope, id, {
      ...this.props,
      ...props
    }, handler);
  }

  public schedule<D extends Dependency<any>>(scope: Build<cdk.Construct>, id: string, props: ScheduleProps<D>, handler: (event: CloudWatch.Event, clients: Client<D>, context: any) => Promise<any>): Function<CloudWatch.Event, any, D> {
    return schedule(scope, id, {
      ...this.props,
      ...props
    }, handler);
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
      return resource.handle(event, runtimeContext);
    });
    const integration = new LambdaIntegration(handler);
    return integration;
  }
}
