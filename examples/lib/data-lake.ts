import { Core, Lambda } from 'punchcard';

import * as Analytics from '@punchcard/data-lake';

import { Record, string, array, integer, timestamp } from '@punchcard/shape';
import { char } from '@punchcard/shape-hive';

export const app = new Core.App();
const stack = app.stack('data-lake');

class DataPoint extends Record({
  key: string,
  value: char(10),
  data_points: array(integer),
  timestamp
}) {}

// create a schema to describe our data
const dataPoints = new Analytics.Schema({
  schemaName: 'data_points',
  shape: DataPoint,
  timestampField: 'timestamp'
});

/**
 * A data lake is a collection of schemas, where each schema has corresponding
 * infrastructure to collect data:
 *
 * Kinesis -> Firehose -> S3 -> Lambda -> S3
 *                                     -> Glue Table
 */
const lake = new Analytics.DataLake(stack, 'Lake', {
  lakeName: 'my_lake',
  schemas: {
    dataPoints
  }
});
// we can consume from the stream of data points in real-time and log out each property
// Kinesis -> Lambda
// Note: the type-safety of the `record`
lake.pipelines.dataPoints.stream
  .records()
  .forEach(stack, 'ForEachDataPoint', {}, async (record) => {
    console.log('key', record.key);
    console.log('value', record.value);
    console.log('data points', record.data_points);
    console.log('timestamp', record.timestamp);
    // console.log('this does not compile', record.doesNotExist)
  });

// send some dumy data to the dataPoints schema
Lambda.schedule(stack, 'DummyDataPoints', {
  depends: lake.pipelines.dataPoints.stream.writeAccess(),
  schedule: Lambda.Schedule.rate(Core.Duration.minutes(1)),
}, async (_, stream) => {
  await stream.putRecord(new DataPoint({
    key: 'key',
    data_points: [0, 1, 2],
    timestamp: new Date(),
    value: 'some-value'
  }));
});
