
import cdk = require('@aws-cdk/cdk');
import { integer, string, LambdaExecutorService, Rate, Schema, timestamp, char, array, DataLake } from 'punchcard';

const app = new cdk.App();
export default app;

const stack = new cdk.Stack(app, 'data-lake');

// create a schema to describe our data
const dataPoints = new Schema({
  schemaName: 'data_points',
  shape: {
    key: string(),
    value: char(10),
    data_points: array(integer()),
    timestamp
  },
  timestampField: 'timestamp'
});

// A data lake is a collection of schemas and infrastructure to collect data
// with Kinesis and persist in S3, exposed as a minutely partitioned Glue Table
const lake = new DataLake(stack, 'Lake', {
  lakeName: 'my_lake',
  schemas: {
    dataPoints
  }
});

// send some dumy data to the dataPoints schema
new LambdaExecutorService().schedule(stack, 'DummyDataPoints', {
  clients: {
    stream: lake.pipelines.dataPoints.stream.writeClient()
  },
  rate: Rate.minutes(1),
  handle: async (_, {stream}) => {
    await stream.putRecord({
      PartitionKey: 'partition-key',
      Data: {
        key: 'key',
        data_points: [0, 1, 2],
        timestamp: new Date(),
        value: 'some-value'
      }
    });
  }
});

// consume from the stream of data points in real-time and log out each property
// Note: the type-safety of the `record`
lake.pipelines.dataPoints.stream.forEach(stack, 'ForEachDataPoint', async (record) => {
  console.log('key', record.key);
  console.log('value', record.value);
  console.log('data points', record.data_points);
  console.log('timestamp', record.timestamp);
});
