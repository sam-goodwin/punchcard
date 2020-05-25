import { Core, DynamoDB, Lambda } from 'punchcard';

import { array, string, Record, optional, union, number, Fields, StringShape, RecordShape, Value, Interface, VFunction, } from '@punchcard/shape';
import { ID, Api, Trait, Query, Mutation, Subscription, CachingBehavior, CachingInstanceType, $context, $if, VRecord, VObject } from 'punchcard/lib/appsync';
import { $util } from 'punchcard/lib/appsync/lang/util';
import { DynamoDSL } from 'punchcard/lib/dynamodb/dsl/dynamo-repr';

class Post extends Record('Post', {
  id: ID,
  title: string,
  content: string
}) {}

class PostMutations extends Mutation({
  addPost: VFunction({
    args: {
      title: string,
      content: string
    },
    returns: Post
  }),

  updatePost: VFunction({
    args: {
      id: ID,
      content: string
    },
    returns: Post
  })
}) {}

class PostQueries extends Query({
  getPost: VFunction({
    args: {
      id: ID
    },
    returns: Post
  })
}) {}

const app = new Core.App();
const stack = app.stack('demo');

const postStore = new DynamoDB.Table(stack, 'PostStore', {
  data: Post,
  key: {
    partition: 'id'
  }
});

const api = new Api(stack, 'Api', {
  name: 'PostApi',
  fragments: [
    new PostMutations({
      addPost: {
        *resolve({title, content}) {
          return yield* postStore.put({
            id: yield* $util.autoId(),
            title,
            content
          });
        }
      },
      updatePost: {
        *resolve({id, content}) {
          return yield* postStore.update({
            key: {
              id
            },
            *transaction(post) {
              yield* post.content.set(content);
            },
            condition: item => DynamoDSL.expect(item.id.equals(id))
          })
        }
      }
    }),
    new PostQueries({
      getPost: {
        *resolve({id}) {
          return yield* postStore.get({
            id
          });
        }
      }
    })
  ]
})

