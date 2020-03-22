import 'jest';

import { array, optional, Record, string } from '@punchcard/shape';
import { Api } from '../../lib/appsync/api';
import { Mutation, Query } from '../../lib/appsync/decorators';
import { $if } from '../../lib/appsync/expression';
import { $api } from '../../lib/appsync/syntax';
import { GraphQLResolver, ID, VObject } from '../../lib/appsync/types';
import { $util } from '../../lib/appsync/util';
import { App } from '../../lib/core';
import { Scope } from '../../lib/core/construct';
import DynamoDB = require('../../lib/dynamodb');
import { Function } from '../../lib/lambda';

export class PostStore extends DynamoDB.Table.NewType({
  data: type => Post.Record,
  key: {
    partition: 'id'
  }
}) {}

class PostApi extends Api {
  public readonly table: PostStore;

  public readonly Post: Post;

  constructor(scope: Scope, id: string) {
    super(scope, id);

    this.table = new PostStore(this, 'pet-store');
    this.Post = new Post(this, 'Post', this.table);
  }

  /**
   * AppSync Function for getting a post with Lambda.
   */
  @Query
  public getPost = $api({id: ID}, optional(this.Post))
    .resolve('post', ({id}) => this.getPostFn.invoke(id))
    .return('post');

  private readonly getPostFn = new Function(this, 'getPostFn', {
    request: string,
    response: this.Post,
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
  public addPost = $api({title: optional(string), content: string}, this.Post)
    .let('id', () => $util.autoId())
    .let('a', ({id}) => VObject.string`#if(${id.size()} > 0)hello#{else}goodbye#end`)
    .let('idUpper', ({id}) => id.toUpperCase())
    .validate(({content}) => content.isNotEmpty(), 'content must not be empty')
    .resolve('item', () => this.table.get({
      id: VObject.string('test')
    }))
    .resolve('newPost', ({id, title, content}) => this.addPostFn.invoke({
      id,
      title: $if($util.isNull(title), () =>
        title
      ).$else(() =>
        VObject.string('generated title')
      ),
      content
    }))
    .return('newPost');

  /**
   * Nested class to represent input enveolve types.
   */
  public AddPostRequest = class AddPostRequest extends Record({
    /**
     * This is an ID.
     */
    id: optional(string),
    title: string,
    content: string
  }) {};
  // alternative syntax that doesn't name the class
  // public AddPostRequest = Record({
  //  /**
  //   * This is an ID.
  //   */
  //   id: optional(string),
  //   title: string,
  //   content: string
  // });

  private readonly addPostFn = new Function(this, 'addPostFn', {
    request: this.AddPostRequest,
    response: this.Post,
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
namespace PostApi {
  /**
   * Type of nested class.
   */
  export type AddPostRequest = PostApi['AddPostRequest'];
}

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
  constructor(scope: Scope, id: string, private readonly table: PostStore) {
    super(scope, id);
  }

  /**
   * Related Posts can be resolved from Lambda.
   */
  // public relatedPosts: Resolved<ArrayShape<Post.Record>> = this.$field(array(this))
  public relatedPosts = this.$field(array(this))
    .resolve('item', () => this.table.get({
      id: this.$.id
    }))
    .resolve('relatedPosts', ({item}) =>
      this.getRelatedPosts.invoke(item.title)
    )
    .return('relatedPosts');

  /**
   * Lambda Function for getting related posts.
   */
  private getRelatedPosts = new Function(this, 'getRelatedPosts', {
    request: string,
    response: array(this.Shape),
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

const app = new App();
const stack = app.stack('stack');

const postApi = new PostApi(stack, 'PostApi');

