// CDK types are imported as type-only
import * as glue from "@aws-cdk/aws-glue";
import {Core, DynamoDB, Glue, Lambda, SNS} from "punchcard";
import {Record, array, integer, string, timestamp} from "@punchcard/shape";
import {Build} from "punchcard/lib/core/build";
import {CDK} from "punchcard/lib/core/cdk";
import uuid = require("uuid");

export const app = new Core.App();

const stack = app.stack("stream-processing");

/**
 * Define the shape of the SNS notifications
 * with a Record.
 */
class NotificationRecord extends Record({
  /**
   * This is a property named `key` with type `string`.
   */
  count: integer,
  key: string,
  timestamp: timestamp,
}) {}

/**
 * Create a SNS Topic to send and receive `NotificationRecord` notifications.
 */
const topic = new SNS.Topic(stack, "Topic", {
  shape: NotificationRecord,
});

/**
 * Shape of the data we'll store in AWS DynamoDB.
 */
class TagLookupRecord extends Record({
  key: string,
  tags: array(string),
}) {}

/**
 * Create a DynamoDB Table to store `TagLookupRecord` records.
 */
const enrichments = new DynamoDB.Table(stack, "Enrichments", {
  data: TagLookupRecord,
  key: {
    partition: "key",
  },
  tableProps: CDK.map(({dynamodb}) => ({
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  })),
});

/**
 * Schedule a Lambda Function to send a (dummy) message to the SNS topic:
 *
 * CloudWatch Event --(minutely)--\> Lambda --(send)-\> SNS Topic
 *                                          --(put)--\> Dynamo Table
 **/

Lambda.schedule(
  stack,
  "DummyData",
  {
    /**
     * Trigger the function every minute.
     */
    depends: Core.Dependency.concat(
      topic.publishAccess(),
      enrichments.writeAccess(),
    ),

    /**
     * Define our runtime dependencies:
     *
     * We want to *publish* to the SNS `topic` and *write* to the DynamoDB `table`.
     */
    schedule: Lambda.Schedule.rate(Core.Duration.minutes(1)),
  },
  async (_, [topic, table]) => {
    /**
     * Impement the Lambda Function.
     *
     * We are passed clients for each of our dependencies: `topic` and `table`.
     */
    const key = uuid();
    // write some data to the dynamodb table
    await table.put(
      new TagLookupRecord({
        key,
        tags: ["some", "tags"],
      }),
    );

    // send 3 SNS notifications
    await Promise.all(
      [1, 2, 3].map(async (i) => {
        // message is structured and strongly typed (based on our Topic definition above)
        await topic.publish(
          new NotificationRecord({
            count: i,
            key,
            timestamp: new Date(),
          }),
        );
      }),
    );
  },
);

/**
 * Process each SNS notification in Lambda:
 *
 * SNS -\> Lambda
 */
topic.notifications().forEach(stack, "ForEachNotification", {}, (message) => {
  console.log(
    `received notification '${
      message.key
    }' with a delay of ${new Date().getTime() - message.timestamp.getTime()}ms`,
  );
  return Promise.resolve();
});

/**
 * Subscribe SNS Topic to a SQS Queue:
 *
 * SNS --(subscription)--\> SQS
 */
const queue = topic.toSQSQueue(stack, "Queue");

/**
 * Log record to collect into Kinesis and store in Glue.
 */
class LogDataRecord extends Record({
  count: integer,
  key: string,
  tags: array(string),
  timestamp: timestamp,
}) {}

/**
 * Process each message in SQS with Lambda, look up some data in DynamoDB and persist results in a Kinesis Stream:
 *
 *              Dynamo
 *                | (get)
 *                v
 * SQS Queue -\> Lambda -\> Kinesis Stream
 */
const stream = queue
  .messages() // gives us a nice chainable API
  .map(
    {
      depends: enrichments.readAccess(),
    },
    async (message, e) => {
      // here we transform messages received from SQS by looking up some data in DynamoDB
      const enrichment = await e.get({
        key: message.key,
      });

      return new LogDataRecord({
        ...message,
        tags: enrichment ? enrichment.tags : [],
        timestamp: new Date(),
      });
    },
  )
  .toKinesisStream(stack, "Stream", {
    partitionBy: (value) => value.key,

    // partition values across shards by the 'key' field
    shape: LogDataRecord,

    // enable encryption
    streamProps: CDK.map(({kinesis}) => ({
      encryption: kinesis.StreamEncryption.KMS,
    })),
  });

/**
 * Persist Kinesis Stream data as a tome-series Glue Table.
 *
 * Kinesis Stream -\> Firehose Delivery Stream -\> S3 (staging) -\> Lambda -\> S3 (partitioned by `year`, `month`, `day`, `hour` and `minute`)
 *                                                                         -\> Glue Catalog
 */
const database: Build<glue.Database> = CDK.chain(({glue}) =>
  stack.map(
    (stack) =>
      new glue.Database(stack, "Database", {
        databaseName: "my_database",
      }),
  ),
);

// @ts-ignore
const table = stream
  .toFirehoseDeliveryStream(stack, "ToS3")
  .objects()
  .toGlueTable(stack, "ToGlue", {
    // @ts-ignore
    columns: LogDataRecord,
    database,
    // @ts-ignore
    partition: {
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      get: (col) => Glue.Partition.byMinute(col.timestamp),
      // @ts-ignore
      keys: Glue.Partition.Minutely,
    },
    tableName: "my_table",
  });
