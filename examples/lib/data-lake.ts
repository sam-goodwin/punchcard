import { Core, Lambda } from 'punchcard';

import { array, integer, Maximum, Minimum, optional, string, timestamp, Type } from '@punchcard/shape';
import { ID } from 'punchcard/lib/appsync';
import { SearchResponse } from 'punchcard/lib/elasticsearch/es-index';
import * as uuid from 'uuid';
import { DataLake } from '@punchcard/data-lake';
import { Construct } from '../../packages/punchcard/lib/core/construct';
import { Build } from 'punchcard/lib/core/build';

export const app = new Core.App();

const stack = app.stack('data-lake');

const lake = new DataLake(stack, 'data-lake', {
  lakeName: 'my-lake',
});

class Post extends Type('Post', {
  postID: ID,
  postTime: timestamp,
  postContent: string,
}) {}

const postDataType = lake.addDataType({
  type: Post,
  id: 'postID',
  timestamp: 'postTime'
});

Lambda.schedule(stack, 'DummyData', {
  depends: postDataType.stream.writeAccess(),
  schedule: Lambda.Schedule.rate(Core.Duration.minutes(1))
}, async (_, postDataStream) => {
  await postDataStream.putRecord(new Post({
    postID: uuid.v4(),
    postContent: 'hello from stream',
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
  depends: postDataType.index.readAccess()
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