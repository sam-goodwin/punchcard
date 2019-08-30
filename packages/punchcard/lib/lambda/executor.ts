import events = require('@aws-cdk/aws-events');
import eventTargets = require('@aws-cdk/aws-events-targets');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/core');

import { Integration, LambdaIntegration, Resource } from '../api-gateway';
import { Client } from '../core/client';
import { Dependency } from '../core/dependency';
import { Type } from '../shape/types/type';
import { Omit } from '../util/omit';
import { Function } from './function';

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

  public spawn<T, U, D extends Dependency<any>>(scope: cdk.Construct, id: string, props: {
    request?: Type<T>,
    response?: Type<U>,
    depends: D,
    handle: (event: T, run: Client<D>, context: any) => Promise<U>;
  }): Function<T, U, D> {
    return new Function<T, U, D>(scope, id, {
      ...this.props,
      ...props
    });
  }

  public schedule<D extends Dependency<any>>(scope: cdk.Construct, id: string, props: {
    schedule: events.Schedule;
    depends?: D;
    handle: (event: CloudwatchEvent, run: Client<D>, context: any) => Promise<any>;
  }): Function<CloudwatchEvent, any, D> {
    scope = new cdk.Construct(scope, id);
    const f = new Function<CloudwatchEvent, any, D>(scope, 'Function', {
      ...this.props,
      ...props
    });

    new events.Rule(scope, 'Schedule', {
      schedule: props.schedule,
      targets: [new eventTargets.LambdaFunction(f)]
    });

    return f;
  }

  public apiIntegration<D extends Dependency<any>>(parent: cdk.Construct, id: string, props: {
    depends: D;
  }): Integration<D> {
    const handler = this.spawn(parent, id, {
      depends: props.depends,
      handle: async (event: any, runtimeContext: Client<D>) => {
        const resourceId = event.__resourceId; // TODO: we implicitly know this field exists - magic field. see ../api-gateway/resource.ts
        const resource: Resource = integration.findResource(resourceId);
        if (!resource) {
          throw new Error(`could not resolve resource handler for resourceId: ${resourceId}`);
        }
        return await resource.handle(event, runtimeContext);
      }
    });
    const integration = new LambdaIntegration(handler);
    return integration;
  }
}

export interface CloudwatchEvent {
  account: string;
  region: string;
  detail: any;
  'detail-type': string;
  source: string;
  time: string;
  id: string;
  resources: string[];
}
