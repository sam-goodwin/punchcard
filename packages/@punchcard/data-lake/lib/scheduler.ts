
import events = require('@aws-cdk/aws-events');
import cdk = require('@aws-cdk/core');

import { Lambda } from 'punchcard';
import { Client, Dependency } from 'punchcard/lib/core';
import { ScheduleStateTable } from './data-lake';

export interface SchedulerProps<D extends Dependency<any>> {
  scheduleId: string;
  scheduleState: ScheduleStateTable;
  scheduleWindow: cdk.Duration;
  scheduleStartTime: Date;
  depends: D;
  handle: (time: Date, scheduleId: string, client: Client<D>) => Promise<void>;
}
export class Scheduler<D extends Dependency<any>> extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: SchedulerProps<D>) {
    super(scope, id);

    Lambda.schedule(this, 'Scheduler', {
      timeout: cdk.Duration.seconds(30),
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),

      depends: Dependency.tuple(
        props.depends,
        props.scheduleState),

      handle: async (_, [depends, scheduleStore], context) => {
        const scheduleState = await getState();
        let nextTime = scheduleState.nextTime;
        do {
          if (nextTime.getTime() < new Date().getTime()) {
            await props.handle(nextTime, props.scheduleId, depends);
            await updateState(nextTime);
            nextTime = new Date(nextTime.getTime() + props.scheduleWindow.toMilliseconds());
          } else {
            break;
          }
        } while (context.getRemainingTimeInMillis() >= 2000);

        async function getState() {
          let state = await get();
          if (!state) {
            state = {
              id: props.scheduleId,
              nextTime: props.scheduleStartTime
            };
            try {
              await scheduleStore.put({
                item: state,
                if: item => item.id.isNotSet()
              });
            } catch (err) {
              if (err.code === 'ConditionalCheckFailedException') {
                state = await get();
              } else {
                throw err;
              }
            }
          }
          return state!;

          function get() {
            return scheduleStore.get({
              id: props.scheduleId
            });
          }
        }

        async function updateState(time: Date) {
          try {
            await scheduleStore.update({
              key: {
                id: props.scheduleId
              },
              actions: item => [
                item.nextTime.incrementMs(props.scheduleWindow.toMilliseconds())
              ],
              if: item => item.nextTime.equals(time)
            });
          } catch (err) {
            if (err.code !== 'ConditionalCheckFailedException') {
              throw err;
            }
          }
        }
      }
    });
  }
}