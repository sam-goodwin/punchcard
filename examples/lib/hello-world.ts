import cdk = require('@aws-cdk/core');
import { Schedule } from '@aws-cdk/aws-events';
import { Core, Lambda, DynamoDB, SQS } from 'punchcard';
import { string, integer, Value, DataType, MaxLength, PropertyName, Type } from 'punchcard/lib/shape';
import { Dependency } from 'punchcard/lib/core';

export const app = new Core.App();
const stack = app.root.map(app => new cdk.Stack(app, 'hello-world'));

/**
 * Rate
 */
@DataType({
  version: 1
})
class RateType {
  public static readonly new = Value.factory(RateType);

  /**
   * Rate Key documentation goes here.
   */
  @MaxLength(1)
  @PropertyName('key_override')
  key = string({
    maxLength: 1
  });
  
  rating = integer();
}

const hashTable = new DynamoDB.Table(stack, 'Table', {
  attributes: RateType,
  partitionKey: 'key',
});

const sortedTable = new DynamoDB.Table(stack, 'Table', {
  attributes: RateType,
  partitionKey: 'key',
  sortKey: 'rating'
});

Lambda.schedule(stack, 'MyFunction', {
  schedule: Schedule.rate(cdk.Duration.minutes(1)),
  depends: Dependency.concat(
    hashTable.readWriteAccess(),
    sortedTable.readAccess()),
}, async(_, [hashTable, sortedTable]) => {
  console.log('Hello, World!');

  const hashItem = await hashTable.get('hash key');
  const sortedItem = await sortedTable.get(['hash key', 1]);
});

const rateValue: Value<RateType> = RateType.new({
  key: 'key',
  rating: 1
});

const queue = new SQS.Queue(stack, 'queue', {
  shape: RateType
});

queue.messages().forEach(stack, 'ForEachMessage', {}, async (e) => {
});


