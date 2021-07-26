import { array, map, string, timestamp, Type } from '@punchcard/shape';

/**
 * @see https://docs.aws.amazon.com/lambda/latest/dg/services-cloudwatchlogs.html
 */
export namespace Event {
  export class LogEvent extends Type({
    id: string,
    timestamp: timestamp,
    message: string,
  }) {}

  export class Data extends Type({
    // switch to enum? 'DATA_MESSAGE' | 'CONTROL_MESSAGE', latter of should can be ignored
    messageType: string,
    // account
    owner: string,
    logGroup: string,
    logStream: string,
    subscriptionFilters: array(string),
    logEvents: array(LogEvent),
  }) {}

  export class EncodedData extends Type({
    data: string,
  }) {}

  export class Payload extends Type({
    awslogs: EncodedData,
  }) {}
}
