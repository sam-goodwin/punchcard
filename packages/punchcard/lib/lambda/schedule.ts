import events = require('@aws-cdk/aws-events');
import eventTargets = require('@aws-cdk/aws-events-targets');
import cdk = require('@aws-cdk/core');

import * as CloudWatch from '../cloudwatch';

import { Build } from '../core/build';
import { Client } from '../core/client';
import { Dependency } from '../core/dependency';
import { Function, FunctionProps } from './function';

export interface ScheduleProps<D extends Dependency<any>> extends _ScheduleProps<D> {}
type _ScheduleProps<D extends Dependency<any>> = FunctionProps<CloudWatch.Event, any, D> & {
  schedule: events.Schedule;
};

/**
 * Create a new Lambda Function and trigger it to run on some schedule.
 *
 * @param scope construct scope to create Function under
 * @param id id of the Function construct.
 * @param props function and schedule props.
 */
export function schedule<D extends Dependency<any>>(scope: Build<cdk.Construct>, id: string, props: ScheduleProps<D>, handler: (event: CloudWatch.Event, clients: Client<D>, context: any) => Promise<any>) {
  const f = new Function<CloudWatch.Event, any, D>(scope, id, props, handler);

  f.resource.map(f => new events.Rule(f, 'Schedule', {
    schedule: props.schedule,
    targets: [new eventTargets.LambdaFunction(f)]
  }));

  return f;
}