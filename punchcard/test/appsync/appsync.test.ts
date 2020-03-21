import 'jest';

import { array, optional, Record, string, Value } from '@punchcard/shape';
import { Mutation, Query } from '../../src/appsync/decorators';
import { $if } from '../../src/appsync/expression';
import { GraphQL, GraphQLResolver, ID } from '../../src/appsync/graphql';
import { $api} from '../../src/appsync/intepreter/resolver';
import { Api } from '../../src/appsync/resolver';
import { App } from '../../src/core';
import { Scope } from '../../src/core/construct';
import DynamoDB = require('../../src/dynamodb');
import { Function } from '../../src/lambda';

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
    .let('id', () => GraphQL.$util.autoId())
    .let('a', ({id}) => GraphQL.string`#if(${id.size()} > 0)hello#{else}goodbye#end`)
    .let('idUpper', ({id}) => id.toUpperCase())
    .validate(({content}) => content.isNotEmpty(), 'content must not be empty')
    .resolve('item', () => this.table.get({
      id: GraphQL.string('test')
    }))
    .resolve('newPost', ({id, title, content}) => this.addPostFn.invoke({
      id,
      title: $if(GraphQL.$util.isNull(title), () =>
        title
      ).$else(() =>
        GraphQL.string('generated title')
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


// class User extends GraphQLResolver({
// }) {
//   constructor(public readonly post: Post) {
//   }

//   public posts = this.$field(this.post);
// }

/*
type Post {
  id: ID!
  title: string!
  content: string!
  relatedPosts: [Post]
}
*/
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
