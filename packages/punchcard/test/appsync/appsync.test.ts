import 'jest';

import { Record, string } from '@punchcard/shape';
import { FunctionDataSource } from '../../lib/appsync/data-source';
import { Arg, Mutation, Query } from '../../lib/appsync/decorators';
import { GraphQL, GraphQLModel, ID, Model } from '../../lib/appsync/types';
import { App } from '../../lib/core';
import { Function } from '../../lib/lambda';

class Post extends Record({
  /**
   * ID
   */
  id: ID,
  /**
   * Title of the Post.
   */
  title: string,
  /**
   * Content of the Post
   */
  content: string
}) {}

namespace Post {
  export class GraphQL extends GraphQLModel(Post) {
    public static relatedPosts(root: Post.GraphQL) {
      // todo
    }
  }
}

function doThing<T extends Model>(type: T): InstanceType<T['GraphQL']> {
  return null as any;
}
const pm = doThing(Post);

class AddPostInput extends Record({
  /**
   * Content.
   */
  content: string,
  title: string
}) {}

class MyApi {
  @Query(returns => [Post.GraphQL])
  public *posts(@Arg('title') title: GraphQL.String) {
    return [new Post.GraphQL(null as any)];
  }

  @Mutation(of => Post)
  public *addPost(@Arg('input') input: AddPostInput): GraphQL<Post> {
    return yield* addPost.invoke(input);
  }
}

const app = new App();
const stack = app.stack('stack');

const addPostFn = new Function(stack, 'fn', {
  request: AddPostInput,
  response: Post
}, async (request) => {
  return new Post({
    id: 'id',
    ...request
  });
});

const addPost = new FunctionDataSource(addPostFn);
// addPost.invoke(new AddPostInput(null as any));

