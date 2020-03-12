import 'jest';

import { string } from '@punchcard/shape';
import { FunctionDataSource } from '../../lib/appsync/data-source';
import { Arg, FieldResolver, Mutation, Query } from '../../lib/appsync/decorators';
import { GraphQL, ID } from '../../lib/appsync/types';
import { $util } from '../../lib/appsync/util';
import { App } from '../../lib/core';
import { Function } from '../../lib/lambda';

function R(): <T>(
  target: T,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<(a: T) => void>
) => void {
  return null as any;
}

class A {
  isA: true;

  @R()
  public a(_a: A): void {

  }
}

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
  @FieldResolver(returns => Post)
  public *relatedPosts(root: Post, @Arg('id') id: GraphQL.String, list: GraphQL.List<GraphQL.String>): GraphQL<Post> {
    const i1 = $util.dynamodb.toDynamoDB(list);
    const i2 = $util.dynamodb.toDynamoDBJson(list);
    const i3 = $util.dynamodb.toString(id);
    const i4 = $util.dynamodb.toStringSet(list);

    const i5 = yield* $util.autoId();

    // return [yield* addPost.invoke(root)];
    return null as any;
  }
}

class AddPostInput extends GraphQL.NewType({
  content: string,
  title: string
}) {}

class MyApi {
  @Query(returns => [Post])
  public *posts(@Arg('title') title: GraphQL.String): GraphQL<Post[]> {
    return [new Post(null as any)];
  }

  @Mutation(of => Post)
  public *addPost(@Arg('input') input: AddPostInput): GraphQL<Post> {
    return yield* addPost.invoke(input);
  }
}

const app = new App();
const stack = app.stack('stack');

const addPostFn = new Function(stack, 'fn', {
  request: AddPostInput.Record,
  response: Post.Record
}, async (request) => {
  return new Post.Record({
    id: 'id',
    ...request
  });
});

const addPost = new FunctionDataSource(addPostFn);

