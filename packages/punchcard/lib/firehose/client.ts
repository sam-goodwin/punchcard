import AWS = require('aws-sdk');

import { Shape, Value } from '@punchcard/shape';
import { Sink, sink, SinkProps } from '../util/sink';
import { DeliveryStream } from './delivery-stream';

export interface PutRecordInput<T> {
  Record: T;
}

export class Client<T extends Shape> implements Sink<T> {
  constructor(
      public readonly stream: DeliveryStream<T>,
      public readonly deliveryStreamName: string,
      public readonly client: AWS.Firehose) {}

  public putRecord(record: Value.Of<T>): Promise<AWS.Firehose.PutRecordOutput> {
    return this.client.putRecord({
      DeliveryStreamName: this.deliveryStreamName,
      Record: {
        Data: this.stream.mapper.write(record)
      }
    }).promise();
  }

  public putRecordBatch(records: Array<Value.Of<T>>): Promise<AWS.Firehose.PutRecordBatchOutput> {
    return this.client.putRecordBatch({
      DeliveryStreamName: this.deliveryStreamName,
      Records: records.map((record, i) => ({
        Data: this.stream.mapper.write(record)
      }))
    }).promise();
  }

  public async sink(records: Array<Value.Of<T>>, props?: SinkProps): Promise<void> {
    await sink(records, async values => {
      const res = await this.putRecordBatch(values);
      if (res.FailedPutCount) {
        const redrive: Array<Value.Of<T>> = [];
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
