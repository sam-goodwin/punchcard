import 'jest';

import { Record, string, RecordType } from '@punchcard/shape';
import { FunctionDataSource } from '../../lib/appsync/data-source';
import { Arg, Mutation, Query } from '../../lib/appsync/decorators';
import { GraphQL, GraphQLModel, ID } from '../../lib/appsync/types';
import { App } from '../../lib/core';
import { Function } from '../../lib/lambda';

class A {

}

namespace A {
  export class B {
    a: string;
  }
}


const aa = a(A);

export interface HasModel extends RecordType {
  Model: new(...args: any[]) => any;
}

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
  export class GraphQL2 {}
  export class GraphQL extends GraphQLModel(Post) {
    public static relatedPosts(root: Post.GraphQL) {
      // todo
    }
  }
}

function doThing<T extends GraphQLModel>(type: T): InstanceType<T['GraphQL']> {
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
  @Query(returns => [Post.Model])
  public *posts(@Arg('title') title: GraphQL.String) {
    return [new PostType()];
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

