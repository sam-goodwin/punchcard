import * as Analytics from "@punchcard/data-lake";
import {Core, Lambda} from "punchcard";
import {Record, array, integer, string, timestamp} from "@punchcard/shape";
import {char} from "@punchcard/shape-hive";

export const app = new Core.App();
const stack = app.stack("data-lake");

class DataPoint extends Record({
  // eslint-disable-next-line @typescript-eslint/camelcase
  data_points: array(integer),
  key: string,
  timestamp,
  value: char(10),
}) {}

// create a schema to describe our data
const dataPoints = new Analytics.Schema({
  schemaName: "data_points",
  // @ts-ignore
  shape: DataPoint,
  // @ts-ignore
  timestampField: "timestamp",
});

/**
 * A data lake is a collection of schemas, where each schema has corresponding
 * infrastructure to collect data:
 *
 * Kinesis -\> Firehose -\> S3 -\> Lambda -\> S3 -\> Glue Table
 */
const lake = new Analytics.DataLake(stack, "Lake", {
  lakeName: "my_lake",
  schemas: {
    dataPoints,
  },
});
// we can consume from the stream of data points in real-time and log out each property
// Kinesis -> Lambda
// Note: the type-safety of the `record`
lake.pipelines.dataPoints.stream.records().forEach(
  stack,
  "ForEachDataPoint",
  {},
  (record): Promise<void> => {
    console.log("key", record.key);
    console.log("value", record.value);
    console.log("data points", record.data_points);
    console.log("timestamp", record.timestamp);
    // console.log('this does not compile', record.doesNotExist)
    // todo: delete the following promise creation & return (solely there to suppress type error).
    // this arg of the fn returned from `records()` should be overloaded to accept a sync fn
    return Promise.resolve();
  },
);

// send some dumy data to the dataPoints schema
Lambda.schedule(
  stack,
  "DummyDataPoints",
  {
    depends: lake.pipelines.dataPoints.stream.writeAccess(),
    schedule: Lambda.Schedule.rate(Core.Duration.minutes(1)),
  },
  async (_, stream) => {
    await stream.putRecord(
      new DataPoint({
        // eslint-disable-next-line @typescript-eslint/camelcase
        data_points: [0, 1, 2],
        key: "key",
        timestamp: new Date(),
        value: "some-value",
      }),
    );
  },
);
