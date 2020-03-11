import 'jest';

import { Record, string } from '@punchcard/shape';
import { Arg, FieldResolver, Mutation, Query } from '../../lib/appsync/decorators';
import { invoke } from '../../lib/appsync/resolver';
import { GraphQL, ID } from '../../lib/appsync/types';
import { App } from '../../lib/core';
import { Function } from '../../lib/lambda';

class Post extends GraphQL.NewType({
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
}) {

  public *relatedPosts(root: Post, @Arg('id') id: GraphQL.String) {
    // return [yield* invoke(addPost, root)] as Post[];
    return [yield* invoke(addPost, root)];
    // return yield* invoke(addPost, root);
  }
}

class AddPostInput extends GraphQL.NewType(Post.Record.Pick(['content', 'title']).members) {}

class MyApi {
  // @Query(returns => [Post])
  // public *posts(@Arg('title') title: GraphQL.String) {

  //   return [post as Post];
  // }

  public *addPost(@Arg('input') input: AddPostInput) {
    return yield* invoke(addPost, input);
  }
}


const app = new App();
const stack = app.stack('stack');

const addPost = new Function(stack, 'fn', {
  request: AddPostInput.Record,
  response: Post.Record
}, async (request) => {
  return new Post.Record({
    id: 'id',
    ...request
  });
});
