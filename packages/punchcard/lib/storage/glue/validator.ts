import cdk = require('@aws-cdk/cdk');

import { Function, LambdaExecutorService } from '../../compute';
import { Shape } from '../../shape';
import { Table } from './table';

/**
 * Properties for creating a Validator.
 */
export interface ValidatorProps<T extends Shape> {
  /**
   * Table that the flowing data belongs to.
   */
  table: Table<T, any>;

  /**
   * Optionally provide an executorService to override the properties
   * of the created Lambda Function.
   *
   * @default executorService with `memorySize: 256` and `timeout: 60`.
   */
  executorService?: LambdaExecutorService;
}

/**
 * Validates and formats records flowing from Firehose so that they match
 * the format of a Glue Table.
 */
export class Validator<T extends Shape> extends cdk.Construct {
  public readonly table: Table<T, any>;
  public readonly processor: Function<FirehoseEvent, FirehoseResponse, {}>;

  constructor(scope: cdk.Construct, id: string, props: ValidatorProps<T>) {
    super(scope, id);
    this.table = props.table;
    const executorService = props.executorService || new LambdaExecutorService({
      memorySize: 256,
      timeout: 60
    });

    this.processor = executorService.run(this, 'Processor', {
      clients: {},
      handle: async (event: FirehoseEvent) => {
        const response: FirehoseResponse = {records: []};
        event.records.forEach(record => {
          try {
            const data = new Buffer(record.data, 'base64');
            const parsed = this.table.mapper.read(data);
            response.records.push({
              recordId: record.recordId,
              result: 'Ok',
              data: this.table.mapper.write(parsed).toString('base64')
            });
          } catch (err) {
            response.records.push({
              recordId: record.recordId,
              result: 'ProcessingFailed',
              data: record.data
            });
          }
        });

        return response;
      }
    });
  }
}

export interface FirehoseEvent {
  records: Array<{
    recordId: string;
    data: string;
  }>
}

export interface FirehoseResponse {
  records: Array<{
    recordId: string;
    result: 'Dropped' | 'Ok' | 'ProcessingFailed';
    data: string;
  }>
}
