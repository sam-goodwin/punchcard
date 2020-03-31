import 'jest';

import { array, integer, nothing, number, optional, Pointer, Record, RecordMembers, RecordShape, Shape, string, StringShape, timestamp } from '@punchcard/shape';
import { VFunction } from '@punchcard/shape/lib/function';
import { $context } from '../../lib/appsync';
import { Api } from '../../lib/appsync/api';
import { Trait } from '../../lib/appsync/impl';
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

export class UserStore extends DynamoDB.Table.NewType({
  data: () => User,
  key: {
    partition: 'id'
  }
}) {}

export class User extends Record('User', {
  id: ID,
  alias: string,
}) {}
export namespace User {
  /**
   * Trait for querying Users.
   */
  export class GetUser extends Trait(Query, {
    getUser: VFunction({
      args: { id: ID },
      returns: User
    })
  }) {}

  /**
   * Trait for mutating Users.
   */
  export class CreateUser extends Trait(Mutation, {
    createUser: VFunction({
      args: { alias: string },
      returns: User
    })
  }) {}

  /**
   * A user record exposts a feed of Posts.
   */
  export class Feed extends Trait(User, {
    feed: array(() => Post)
  }) {}
}


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

  const createUser = new User.CreateUser({
    createUser() {
    }
  });

  const userFeed = new User.Feed({
    feed(f: any) {
      return props.postStore.get({
        id: this.id
      });
    }
  });

  const getUser = new Lambda.Function(scope, 'getUser', {
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
    getUser,
    userStore,
  };
};

export class PostStore extends DynamoDB.Table.NewType({
  data: () => Post,
  key: {
    partition: 'id'
  }
}) {}

export class Post extends Record('Post', {
  /**
   * ID
   */
  id: ID,
  title: string,
  content: string,
  userId: ID,
  category: string,
  timestamp
}) {}
export namespace Post {
  export const Get = <T extends RecordShape>(type: T) => Trait(type, {
    /**
     * Function documentation goes here.
     */
    createPost: VFunction({
      args: { title: string, content: string },
      returns: () => Post
    }),

    getPost: VFunction({
      args: { id: ID, },
      returns: () => Post
    })
  });
}

class PostQuery extends Post.Get(Query) {}

// adds some methods to the top-level (root) `Query` graph node.

class RelatedPosts extends Trait(() => Post, {
  relatedPosts: array(() => Post)
}) {}

export const PostApi = (scope: Scope) => {
  const postStore = new PostStore(scope, 'PostStore');

  const postCRUDApi = new PostQuery({

    // createPost({title, content}) {
    //   const post = postStore.put({
    //     userId: $context.identity.user,
    //     id: $util.autoId(),
    //     title,
    //     content,
    //   });

    //   return post;
    // }
  });

  const relatedPostIndex = postStore.globalIndex({
    indexName: 'related-posts',
    key: {
      partition: 'category',
      sort: 'timestamp'
    }
  });

  const relatedPostsApi = new RelatedPosts({
    relatedPosts({}) {
      return item;
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
    postCrud: postCRUDApi,
    postStore,
  };
};

const app = new App();
const stack = app.stack('stack');

const {postCrud, postStore, getPostFn, } = PostApi(stack);

const {userApiFragment, userStore, getUser} = UserApi(stack, {
  postStore
});

export type Static<T> = T;
export interface MyApi extends Static<typeof MyApi> {}

const frag = postCrud.include(userApiFragment);

const MyApi = new Api(stack, 'MyApi', {
  name: 'MyApi',
  query: Query,
  types: frag
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
