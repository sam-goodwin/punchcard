## Punchcard

Punchcard is an opinionated, high-level framework for building cloud-native applications on AWS with the [AWS Cloud Development Kit (CDK)]((https://github.com/awslabs/aws-cdk)). You create and use ordinary data structures that are backed by CDK `Constructs` and deployed to AWS CloudFormation. It creates a type-safe development experience that feels like local in-memory programming, but runs in the cloud!

See the [AWS CDK documentation](https://docs.aws.amazon.com/cdk/latest/guide/what-is.html).

## Getting Started 

Install the `aws-cdk`, `@aws-cdk/cdk` and `punchcard` packages:

```shell
npm install --save-dev aws-cdk
npm install --save @aws-cdk/cdk
npm install --save punchcard
```

Create an `index.ts` file in the root and create a `cdk.App`:

```ts
import cdk = require('@aws-cdk/cdk');
import punchcard = require('punchcard');

const app = new cdk.App();
const stack = new cdk.Stack(app, 'CronStack');

// make sure you export the app as default, or else your code won't run at runtime
export default app;
```

Build with `npm` and deploy the app with the `cdk`:

```shell
npm run build

./node_modules/aws-cdk/bin/cdk deploy -a ./index.js
```

## Example Application

The below app (very quickly) sets up an architecture where data in a Kinesis Stream is processed by a Lambda Function and stored in a DynamoDB Table:

```ts
// create a kinesis stream containing JSON data
const stream = new punchcard.KinesisStream(stack, 'Stream', {
  mapper: punchcard.Json.forShape({
    // structure of data in the stream
    id: punchcard.string(),
    count: punchcard.integer()
  }),
});

// store a record of when an item in the stream was processed
const table = new punchcard.HashTable(stack, 'Counter', {
  partitionKey: 'id',
  shape: {
    id: punchcard.string(),
    count: punchcard.integer(),
    processedTime: punchcard.timestamp
  }
});

stream
  .map(record => {
    // map over every record and attach a timestamp
    return {
      ...record,
      processed_time: new Date()
    };
  })
  .context({
    // use the table at runtime
    table
  })
  .forEach(async (item, {table}) => { // runtime representation of the table is now available
    // put the item to our hash map (dynamodb)
    await table.put({
      item,
    });
    
    // or: only put if the record does not exists
    await table.put({
      item,
      if: (item) => punchcard.attribute_not_exists(item.id)
    });

    // or: update an existing record
    await table.update({
      key: {
        id: item.id
      },
      actions: (item) => [
        item.count.increment(1),
        item.processedTime.set(new Date())
      ]
    })
  });
```

## API Gateway

```ts
const api = new punchcard.Api(stack, 'Api');
const tweets = api.addResource('tweets'); // /tweets
const tweetId = tweets.addResource('{tweetId}'); // /tweets/{tweetId}

// GET /tweets/{tweetId}
tweetId.setGetMethod({
  integration: endpoint,

  request: {
    shape: {
      tweetId: string()
    },
    mappings: {
      tweetId: $input.params('tweetId')
    }
  },

  responses: {
    [punchcard.StatusCode.Ok]: {
      tweetText: string({maxLength: 140}),
      hashTags: set(string()),
      timestamp
    },
    [punchcard.StatusCode.NotFound]: {
      tweetId: string()
    },
    [punchcard.StatusCode.InternalError]: {
      errorMessage: string()
    }
  },

  handle: async(request, {tweetStore}) => {
    const tweet = await tweetStore.get(request);
    if (!tweet) {
      return punchcard.response(punchcard.StatusCode.NotFound, {
        payload: request
      })
    }

    return punchcard.response(punchcard.StatusCode.Ok,  {
      payload: tweet
    });
  }
});
```

## Data Collection
Streaming data can be collected to various stores such as S3 Buckets, DynamoDB Tables and Glue Tables:

```ts
const database = new Database(stack, 'Database', {
  databaseName: 'tweets_database'
});
const table = tweetsStream.map(record => {
  return {
    ...record,
    timestamp: new Date()
  };
}).collect(stack, 'TweetsTable', Collectors.toGlue({
  database,
  tableName: 'tweets',
  schema: {
    timestamp,
    tweetId: string(),
    tweetText: string({maxLength: 140}),
    hashTags: array(string())
  }
}));
```

## License

This library is licensed under the Apache 2.0 License. 
