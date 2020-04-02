import 'jest';

import { array, boolean, integer, nothing, number, optional, Pointer, Record, RecordMembers, RecordShape, Shape, string, StringShape, timestamp } from '@punchcard/shape';
import { VFunction } from '@punchcard/shape/lib/function';
import { $context, $else, $if, VBool, VObject, VString } from '../../lib/appsync';
import { Api } from '../../lib/appsync/api';
import { Trait } from '../../lib/appsync/trait';
import { ID, VList, VNothing, VTL } from '../../lib/appsync/types';
import { $util } from '../../lib/appsync/util';
import { App } from '../../lib/core';
import { Scope } from '../../lib/core/construct';
import DynamoDB = require('../../lib/dynamodb');

// root of query interface
export class Query extends Record('Query', {}) {}

// root of mutation interface
export class Mutation extends Record('Mutation', {}) {}

export class User extends Record('User', {
  id: ID,
  alias: string,
}) {}

export class UserStore extends DynamoDB.Table.NewType({
  data: User,
  key: {
    partition: 'id'
  }
}) {}

/**
 * Trait for querying Users.
 *
 * Attachable/generic to any type, T.
 *
 * @typeparam T type to bind this trait to.
 */
export class GetUserTrait extends Trait(Query, {
  getUser: VFunction({
    args: { id: ID },
    returns: User
  })
}) {}

/**
 * Trait for mutating Users.
 *
 * Attachable/generic to any type, T.
 *
 * @typeparam T type to bind this trait to.
 */
export class CreateUserTrait extends Trait(Mutation, {
  createUser: VFunction({
    args: { alias: string },
    returns: User
  })
}) {}

/**
 * A Post of some content in some category
 */
export class Post extends Record('Post', {
  /**
   * ID
   */
  id: ID,
  title: string,
  content: string,
  category: string,
  timestamp
}) {}

export class PostStore extends DynamoDB.Table.NewType({
  data: Post,
  key: {
    partition: 'id'
  }
}) {}

/**
 * A user record exposes a feed of `Post`.
 */
export class FeedTrait extends Trait(User, {
  feed: array(Post)
}) {}

export class GetPostTrait extends Trait(Query, {
  getPost: VFunction({
    args: { id: ID, },
    returns: Post
  })
}) {}

export class CreatePostTrait extends Trait(Mutation, {
  /**
   * Function documentation goes here.
   */
  createPost: VFunction({
    args: { title: string, content: string },
    returns: Post
  }),
}) {}

export class RelatedPostsTrait extends Trait(Post, {
  post: array(Post)
}) {}

/**
 * User API component - implements the query, mutations and field
 * resolvers for Users.
 *
 * @param scope in which to install the component
 * @param props api to add UserAPI to
 */
export const UserApi = (
  scope: Scope,
  props: {
    postStore: PostStore,
    userStore?: UserStore
  }
) => {
  const userStore = props.userStore || new UserStore(scope, 'UserStore');

  const createUser = new CreateUserTrait({
    *createUser({alias}) {
      const id = yield* $util.autoId();

      return yield* userStore.put({
        id,
        alias,
      });
    }
  });

  const getUser = new GetUserTrait({
    *getUser({id}) {
      return yield* userStore.get({id});
    }
  });

  return {
    createUser,
    getUser,
    userStore,
  };
};

export const PostApi = (scope: Scope) => {
  // const postStore = new PostStore(scope, 'PostStore');
  const postStore = new PostStore(scope, 'PostStore');

  const getPost = new GetPostTrait({
    *getPost({id}) {
      return yield* postStore.get({id});
    }
  });

  const createPost = new CreatePostTrait({
    *createPost(input) {
      const id = yield* $util.autoId();
      const timestamp = yield* $util.time.nowISO8601();

      const i: VNothing = yield* $if(input.title.isEmpty(), () =>
        $util.error(VTL.string`Title must be non empty: ${id}`)
      );

      const post = yield* postStore.put({
        id,
        title: input.title,
        content: input.content,
        category: id,
        timestamp
      });

      return post;
    }
  });

  // const relatedPostIndex = postStore.globalIndex({
  //   indexName: 'related-posts',
  //   key: {
  //     partition: 'category',
  //     sort: 'timestamp'
  //   }
  // });

  // const relatedPosts = new RelatedPostsTrait({
  //   *post() {
  //     return (yield* getPostFn.invoke(this.id)) as any;
  //   }
  // });


  return {
    getPost,
    createPost,
    postStore,
  };
};

const app = new App();
const stack = app.stack('stack');

const {createPost, getPost, postStore } = PostApi(stack);

const {createUser, userStore, getUser } = UserApi(stack, {
  postStore
});

export type Static<T> = T;
export interface MyApi extends Static<typeof MyApi> {}


// instantiate an API with that type system
const MyApi = new Api(stack, 'MyApi', {
  name: 'MyApi',
  // root of query starts at the `Query` type
  query: Query,
  // root of mutation starts at the `Mutation` type
  mutation: Mutation,
  // concatenate all the fragments into a single type system
  types: createUser
    .include(getPost)
    .include(getUser)
    .include(createPost)
});

export function doStuffWithApi(api: MyApi) {
}

// const {Post, graphql} = PostApi(stack);
// export class Post extends Post.Record {}

// it('should', () => {
//   const a = Build.resolve(postApi.resource);
//   // const record = foldFree(identity)(stmt => {
//   //   if (StatementGuards.isCall(stmt)) {
//   //     console.log(VInterpreter.render(stmt.request));
//   //   }
//   //   return null as any;
//   // }, a);
//   // console.log(record);
//   // console.log(VInterpreter.render(record));
// });
