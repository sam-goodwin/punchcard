import AWS = require('aws-sdk');

import { Shape, Value } from '@punchcard/shape';
import { sink, Sink, SinkProps } from '../util/sink';
import { Stream } from './stream';

/**
 * A client to a specific Kinesis Stream of some type, `T`.
 *
 * @typeparam T type of data in the stream.
 * @see https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html
 */
export class Client<T extends Shape> implements Sink<Value.Of<T>> {
  constructor(
    public readonly stream: Stream<T>,
    public readonly streamName: string,
    public readonly client: AWS.Kinesis
  ) {}

  /**
   * Gets and deserrializes data records from a Kinesis data stream's shard.
   *
   * @param request get records input request payload.
   */
  public async getRecords(request: GetRecordsInput): Promise<GetRecordsOutput<Value.Of<T>>> {
    const response = await this.client.getRecords(request).promise();

    return {
      ...response,
      Records: response.Records.map(r => ({
        ...r,
        Data: this.stream.mapper.read(r.Data as Buffer)
      })) as any
    };
  }

  /**
   * Put a single record to the Stream.
   *
   * @param input Data and optional ExplicitHashKey and SequenceNumberForOrdering
   */
  public putRecord(input: PutRecordInput<Value.Of<T>>): Promise<PutRecordOutput> {
    return this.client.putRecord({
      ...input,
      StreamName: this.streamName,
      Data: this.stream.mapper.write(input.Data),
      PartitionKey: this.stream.partitionBy(input.Data),
    }).promise();
  }

  /**
   * Put a batch of records to the stream.
   *
   * Note: a successful response (no exception) does not ensure that all records were successfully put to the
   * stream; you must check the error code of each record in the response and re-drive those which failed.
   *
   * Maxiumum number of records: 500.
   * Maximum payload size: 1MB (base64-encoded).
   *
   * @param request array of records containing Data and optional `ExplicitHashKey` and `SequenceNumberForOrdering`.
   * @returns output containing sequence numbers of successful records and error codes of failed records.
   * @see https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html
   */
  public putRecords(request: PutRecordsInput<Value.Of<T>>): Promise<PutRecordsOutput> {
    return this.client.putRecords({
      StreamName: this.streamName,
      Records: request.map(record => ({
        ...record,
        Data: this.stream.mapper.write(record.Data),
        PartitionKey: this.stream.partitionBy(record.Data)
      }))
    }).promise();
  }

  /**
   * Put all records (accounting for request limits of Kinesis) by batching all records into
   * optimal `putRecords` calls; failed records will be redriven, and intermittent failures
   * will be handled with back-offs and retry attempts.
   *
   * TODO: account for total payload size of 1MB base64-encoded.
   *
   * @param records array of records to 'sink' to the stream.
   * @param props configure retry and ordering behavior
   */
  public async sink(records: Array<Value.Of<T>>, props?: SinkProps): Promise<void> {
    await sink(records, async values => {
      const result = await this.putRecords(values.map(value => ({
        Data: value
      })));

      const redrive: Array<Value.Of<T>> = [];
      if (result.FailedRecordCount) {
        result.Records.forEach((r, i) => {
          if (!r.SequenceNumber) {
            redrive.push(values[i]);
          }
        });
      }
      return redrive;
    }, props, 500);
  }
}

export interface GetRecordsInput extends AWS.Kinesis.GetRecordsInput {}
export interface GetRecordsOutput<T> extends _GetRecordsOutput<T> {}
type _GetRecordsOutput<T> = AWS.Kinesis.GetRecordsOutput & {
  Records: Array<_Record<T>>;
};

export interface Record<T> extends _Record<T> {}
type _Record<T> = Omit<AWS.Kinesis.Record, 'Data'> & {
  /**
   * Deserialized record received from the Kinesis Stream.
   */
  Data: T;
};

export interface PutRecordInput<T> extends _PutRecordInput<T> {}
type _PutRecordInput<T> = {Data: T} & Pick<AWS.Kinesis.PutRecordInput, 'ExplicitHashKey' | 'SequenceNumberForOrdering'>;

export interface PutRecordOutput extends AWS.Kinesis.PutRecordOutput {}

export interface PutRecordsInputItem<T>  extends _PutRecordsInputItem<T> {}
type _PutRecordsInputItem<T> = {Data: T} & Pick<AWS.Kinesis.PutRecordsRequestEntry, 'ExplicitHashKey'>;

export interface PutRecordsInput<T> extends Array<PutRecordsInputItem<T>> {}
export interface PutRecordsOutput extends AWS.Kinesis.PutRecordsOutput {}
