import 'jest';

import { array, boolean, integer, nothing, number, optional, Pointer, Record, RecordMembers, RecordShape, Shape, string, StringShape, timestamp } from '@punchcard/shape';
import { VFunction } from '@punchcard/shape/lib/function';
import { $context, VBool, VObject, VString } from '../../lib/appsync';
import { Api } from '../../lib/appsync/api';
import { Trait } from '../../lib/appsync/trait';
import { ID } from '../../lib/appsync/types';
import { $util } from '../../lib/appsync/util';
import { App } from '../../lib/core';
import { Scope } from '../../lib/core/construct';
import DynamoDB = require('../../lib/dynamodb');
import Lambda = require('../../lib/lambda');

// root of query interface
class Query extends Record('Query', {}) {}

// root of mutation interface
class Mutation extends Record('Mutation', {}) {}

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
export const GetUserTrait = <T extends RecordShape>(type: T) => Trait(type, {
  getUser: VFunction({
    args: { id: ID },
    returns: User
  })
});
/**
 * Trait for mutating Users.
 *
 * Attachable/generic to any type, T.
 *
 * @typeparam T type to bind this trait to.
 */
export const CreateUserTrait = <T extends RecordShape>(type: T) => Trait(type, {
  createUser: VFunction({
    args: { alias: string },
    returns: User
  })
});

/**
 * A user record exposes a feed of `Post`.
 */
export class FeedTrait extends Trait(User, {
  feed: array(Post)
}) {}


class CreateUser extends CreateUserTrait(Mutation) {}

class GetUser extends CreateUserTrait(Query) {}

/**
 * User API component - implements the query, mutations and field
 * resolvers for Users.
 *
 * @param scope in which to install the component
 * @param props api to add UserAPI to
 */
// <A extends Api<{Post: typeof Post}>>
export const UserApi = (
  scope: Scope,
  props: {
    postStore: PostStore,
    userStore?: UserStore
  }
) => {
  const userStore = props.userStore || new UserStore(scope, 'UserStore');

  const createUser = new CreateUser({} as any);

  const getUser = new GetUser({} as any);

  const getUserFn = new Lambda.Function(scope, 'getUser', {
    request: string,
    response: optional(User),
    depends: userStore.readAccess()
  }, async (id, userStore) => {
    const user = await userStore.get({
      id
    });

    return user!; // TODO: why isn't undefined supported?
  });

  return {
    createUser,
    getUser,
    getUserFn,
    userStore,
  };
};

export class PostStore extends DynamoDB.Table.NewType({
  data: Post,
  key: {
    partition: 'id'
  }
}) {}

class GetPostTrait extends Trait(Query, {
  getPost: VFunction({
    args: { id: ID, },
    returns: Post
  })
}) {}

class CreatePostTrait extends Trait(Mutation, {
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

export const PostApi = (scope: Scope) => {
  // const postStore = new PostStore(scope, 'PostStore');
  const postStore = new PostStore(scope, 'PostStore');

  const getPost = new GetPostTrait({
    *getPost({id}) {
      const item = yield* postStore.get({
        id
      });

      const p = yield* getPostFn.invoke(id);

      return p;
    }
  });

  const createPost = new CreatePostTrait({} as any);

  const relatedPostIndex = postStore.globalIndex({
    indexName: 'related-posts',
    key: {
      partition: 'category',
      sort: 'timestamp'
    }
  });

  const getPostFn = new Lambda.Function(scope, 'getPost', {
    request: string,
    response: Post,
    depends: postStore.readAccess()
  }, async (id, posts) => {
    const p = await posts.get({
      id
    });
    if (p === undefined) {
      throw new Error('not found');
    }

    return p;
  });

  return {
    getPostFn,
    getPost,
    createPost,
    postStore,
  };
};

const app = new App();
const stack = app.stack('stack');

const {createPost, getPost, postStore, getPostFn } = PostApi(stack);

const {createUser, userStore, getUser } = UserApi(stack, {
  postStore
});

export type Static<T> = T;
export interface MyApi extends Static<typeof MyApi> {}

// concatenate all the fragments into a single type system
const types = createUser
  .include(getPost)
  .include(getUser)
  .include(createPost)
;

// instantiate an API with that type system
const MyApi = new Api(stack, 'MyApi', {
  name: 'MyApi',
  // root of query starts at the `Query` type
  query: Query,
  types
});

export function doStuffWithApi(api: MyApi) {
  // api.Types
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
