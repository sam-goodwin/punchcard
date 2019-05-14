import events = require('@aws-cdk/aws-events');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/cdk');

import { Integration, LambdaIntegration, Resource } from '../api-gateway';
import { Context, RunContext } from '../runtime';
import { Mapper } from '../shape/mapper/mapper';
import { Raw } from '../shape/mapper/raw';
import { Omit } from '../utils';
import { Function } from './function';

export enum Unit {
  Day = 'day',
  Days = 'days',
  Hour = 'hour',
  Hours = 'hours',
  Minute = 'minute',
  Minutes = 'minutes'
}
export class Rate {
  public static minutes(value: number) {
    if (value === 1) {
      return new Rate(value, Unit.Minute);
    }
    return new Rate(value, Unit.Minutes);
  }

  // TODO: others

  constructor(public readonly rate: number, public readonly unit: Unit) {}

  public get scheduleExpression(): string {
    return `rate(${this.rate} ${this.unit})`;
  }
}

export class LambdaExecutorService {
  constructor(private readonly props: Omit<lambda.FunctionProps, 'runtime' | 'code' | 'handler'> = {
    memorySize: 128
  }) {}

  public run<T, U, C extends Context>(scope: cdk.Construct, id: string, props: {
    requestMapper?: Mapper<T, any>,
    responseMapper?: Mapper<U, any>,
    context: C,
    handle: (event: T, run: RunContext<C>, context: any) => Promise<U>;
  }): Function<T, U, C> {
    return new Function<T, U, C>(scope, id, {
      ...this.props,
      ...props
    });
  }

  public schedule<C extends Context>(scope: cdk.Construct, id: string, props: {
    rate: Rate;
    context: C;
    handle: (event: CloudwatchEvent, run: RunContext<C>, context: any) => Promise<any>;
  }): Function<CloudwatchEvent, any, C> {
    scope = new cdk.Construct(scope, id);
    const f = new Function(scope, 'Function', {
      ...this.props,
      ...props
    });

    new events.EventRule(scope, 'Schedule', {
      scheduleExpression: props.rate.scheduleExpression,
      targets: [f]
    });

    return f;
  }

  public apiIntegration<C extends Context>(parent: cdk.Construct, id: string, props: {
    context: C;
  }): Integration<C> {
    const handler = this.run(parent, id, {
      requestMapper: Raw.passthrough(),
      responseMapper: Raw.passthrough(),
      context: props.context,
      handle: async (event: any, runtimeContext: RunContext<C>) => {
        console.log(JSON.stringify(event, null, 2));
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
