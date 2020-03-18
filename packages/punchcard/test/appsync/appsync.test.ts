import 'jest';

import { array, optional, Record, string } from '@punchcard/shape';
import { Mutation, Query } from '../../lib/appsync/decorators';
import { $if } from '../../lib/appsync/if';
import { $function } from '../../lib/appsync/resolver/resolver';
import { GraphQL, GraphQLResolver, ID } from '../../lib/appsync/types';
import { $util } from '../../lib/appsync/util';
import { App } from '../../lib/core';
import { Construct } from '../../lib/core/construct';
import DynamoDB = require('../../lib/dynamodb');
import { Function } from '../../lib/lambda';

const app = new App();
const stack = app.stack('stack');

export class PostStore extends DynamoDB.Table<typeof Post, {partition: 'id'}> {}

class PostApi extends Construct {
  public readonly table: PostStore;

  constructor() {
    super(null as any);
    this.table = new PostStore(this, 'pet-store', {
      data: Post,
      key: {
        partition: 'id'
      }
    });
  }

  /**
   * AppSync Function for getting a post with Lambda.
   */
  @Query
  public getPost = $function({id: ID}, optional(Post))
    .return(({id}) => this.getPostFn.invoke(id));

  private readonly getPostFn = new Function(this, 'getPostFn', {
    request: string,
    response: Post,
    depends: this.table.readAccess()
  }, async (id, posts) => {
    const p = await posts.get({
      id
    });
    if (p === undefined) {
      throw new Error('not found');
    }
    return p;
  });

  @Mutation
  public addPost = $function({title: optional(string), content: string}, Post)
    .$('id', () => $util.autoId())
    .return(({id, title, content}) => this.addPostFn.invoke({
      id,
      title: $if(GraphQL.isNull(title), () =>
        title
      ).$else(() =>
        GraphQL.string('generated title')
      ),
      content
    }));

  private readonly addPostFn = new Function(this, 'addPostFn', {
    request: AddPostRequest,
    response: Post,
    depends: this.table.readWriteAccess()
  }, async (request, posts) => {
    const post = new Post.Record({
      ...request,
      id: request.id || 'random',
    });

    await posts.put(post);

    return post;
  });
}

class AddPostRequest extends Record({
  id: optional(string),
  title: string,
  content: string
}) {}

class Post extends GraphQLResolver({
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
  constructor(public readonly table: PostStore) {
    super();
  }

  /**
   * Related Posts can be resolved from Lambda.
   */
  public readonly relatedPosts = $function({self: Post}, array(Post))
    .$('item', ({self}) => this.table.get({
      id: self.id
    }))
    .return(({self}) => this.getRelatedPosts.invoke(self.id));

  /**
   * Lambda Function for getting related posts.
   */
  private readonly getRelatedPosts = new Function(stack, 'getRelatedPosts', {
    request: string,
    response: array(Post),
    depends: this.table.readAccess()
  }, async (id, posts) => {
    // todo: perform a query
    const p = await posts.get({
      id
    });
    if (p === undefined) {
      throw new Error('not found');
    }
    return [p];
  });
}
namespace Post {
  export type Record = typeof Post.Record;
}
