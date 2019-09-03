import AWS = require('aws-sdk');

import { Json, Mapper, Shape } from '../shape';
import { Sink, sink, SinkProps } from '../util/sink';
import { DeliveryStream } from './delivery-stream';

export type PutRecordInput<T> = { Record: T; };

export class Client<T> implements Sink<T> {
  public readonly mapper: Mapper<T, string>;

  constructor(
      public readonly stream: DeliveryStream<Shape<T>>,
      public readonly deliveryStreamName: string,
      public readonly client: AWS.Firehose) {
    this.mapper = Json.jsonLine(this.stream.shape);
  }

  public putRecord(record: T): Promise<AWS.Firehose.PutRecordOutput> {
    return this.client.putRecord({
      DeliveryStreamName: this.deliveryStreamName,
      Record: {
        Data: this.mapper.write(record)
      }
    }).promise();
  }

  public putRecordBatch(records: T[]): Promise<AWS.Firehose.PutRecordBatchOutput> {
    return this.client.putRecordBatch({
      DeliveryStreamName: this.deliveryStreamName,
      Records: records.map(record => ({
        Data: this.mapper.write(record)
      }))
    }).promise();
  }

  public async sink(records: T[], props?: SinkProps): Promise<void> {
    await sink(records, async values => {
      const res = await this.putRecordBatch(values);
      if (res.FailedPutCount) {
        const redrive: T[] = [];
        res.RequestResponses.forEach((v, i) => {
          if (v.ErrorCode !== undefined) {
            redrive.push(values[i]);
          }
        });
        return redrive;
      }
      return [];
    }, props, 500);
  }
}
