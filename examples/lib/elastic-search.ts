import { Core, Lambda, ElasticSearch, DynamoDB } from 'punchcard';
import { string, Type, optional, integer, Maximum, Minimum, array, timestamp } from '@punchcard/shape';

import * as uuid from 'uuid';
import { SearchResponse } from 'punchcard/lib/elasticsearch';

export const app = new Core.App();
const stack = app.stack('elastic-search14');

const esCluster = new ElasticSearch.Domain(stack, 'Domain', {
  version: ElasticSearch.Version.V7_4,
  ebsOptions: {
    iops: 1000,
    volumeSize: 128, // GB
    volumeType: ElasticSearch.EbsVolumeType.io1, // high performance
  },
  elasticsearchClusterConfig: {
    instanceType: 'c5.large.elasticsearch',
    dedicatedMasterEnabled: true,
    dedicatedMasterCount: 2,
    dedicatedMasterType: 'c5.large.elasticsearch',
    instanceCount: 1,
    zoneAwarenessEnabled: false,
  },
});

/**
 * Posts to searchg.
 */
class Post extends Type({
  postID: string,
  content: string,
  postTime: timestamp
}) {}

const postStore = new DynamoDB.Table(stack, 'PostStore', {
  data: Post,
  key: {
    partition: 'postID'
  },
});

const postIndex = esCluster.addIndex({
  indexName: 'posts',
  mappings: Post,
  _id: 'postID',
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0
  }
});

postStore.stream().forBatch(stack, 'ForEachPost', {
  depends: postIndex.writeAccess()
}, async (batch, postIndex) => {
  await postIndex.index(...batch.map(_ => _.newImage!));
});

// schedule a Lambda function to increment counts in DynamoDB and send SQS messages with each update.
Lambda.schedule(stack, 'Index', {
  schedule: Lambda.Schedule.rate(Core.Duration.minutes(1)),
  depends: postStore.writeAccess()
}, async (_, postStore) => {
  await postStore.put(new Post({
    postID: uuid(),
    content: 'hello world',
    postTime: new Date()
  }));
});

class SearchRequest extends Type({
  scrollId: optional(string),
  limit: optional(integer
    .apply(Minimum(1))
    .apply(Maximum(1000)))
}) {}

class SearchResult extends Type({
  scrollId: optional(string),
  posts: array(Post)
}) {}

new Lambda.Function(stack, 'Search', {
  request: SearchRequest,
  response: SearchResult,
  depends: postIndex.readAccess()
}, async (request, postIndex) => {
  let response: SearchResponse<Post>;
  if (request.scrollId) {
    response = await postIndex.scroll({
      scroll: '5m',
      scrollId: request.scrollId
    });
  } else {
    response = await postIndex.search({
      scroll: '5m',
      body: {}
    });
  }
  return new SearchResult({
    scrollId: response.scrollId,
    posts: response.hits
  });
});

