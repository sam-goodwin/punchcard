import 'jest';

import { array, integer, number, optional, Pointer, Record, RecordMembers, RecordShape, Shape, string, StringShape, timestamp } from '@punchcard/shape';
import { Do } from 'fp-ts-contrib/lib/Do';
import { foldFree, free } from 'fp-ts-contrib/lib/Free';
import { identity, Identity } from 'fp-ts/lib/Identity';
import { VInterpreter, VString } from '../../lib/appsync';
import { Api, ApiFragment, FQN, ImportIndex } from '../../lib/appsync/api';
import { Mutation } from '../../lib/appsync/decorators';
import { Resolved } from '../../lib/appsync/syntax';
import { $if } from '../../lib/appsync/syntax/if';
import { $mutation } from '../../lib/appsync/syntax/mutation';
import { $ } from '../../lib/appsync/syntax/resolver';
import { ID, VObject } from '../../lib/appsync/types';
import { GraphQLType } from '../../lib/appsync/types/type-constructor';
import { VTL } from '../../lib/appsync/types/vtl';
import { $util } from '../../lib/appsync/util';
import { App, Dependency } from '../../lib/core';
import { Build } from '../../lib/core/build';
import { Scope } from '../../lib/core/construct';
import DynamoDB = require('../../lib/dynamodb');
import { Function } from '../../lib/lambda';

export class User extends Record({
  id: ID,
  alias: string,
}) {
  public static readonly [FQN]: 'User' = 'User';
}

export class UserStore extends DynamoDB.Table.NewType({
  data: User,
  key: {
    partition: 'id'
  }
}) {}

/**
 * User API component.
 *
 * TODO:
 *
 * @param scope in which to install the component
 * @param props api to add UserAPI to
 */
// <A extends Api<{Post: typeof Post}>>
export const UserApi = (
  scope: Scope,
  props: {
    postStore: PostStore
  }
) => {
  const userStore = new UserStore(scope, 'UserStore');

  const userApiFragment = ApiFragment.new({
    import: [
      /**
       * Import the User Type
       */
      User,
      /**
       * Import the Post Type
       */
      Post,
    ],
    resolvers: {
      Post: post => ({
        /**
         * Resolve the User record for a Post.
         */
        author: $(User)
          .call('post', () => userStore.get({
            id: post.id as any
          })) // todo
          .return('post')
      }),
      User: user => ({
        /**
         * Get a User's posts between a start and end
         *
         * @param start lower bound
         * @param end upper bound
         */
        posts: $({start: timestamp, end: timestamp}, Post)
          .call('post', ({start}) => props.postStore.get({
            id: user.id as any
          })) // todo
          .return('post')
      })
    },
    query: {
      /**
       * Get a User by ID.
       */
      getUser: $({id: ID}, optional(User))
        .call('user', ({id}) => getUser.invoke(id))
        .return('user')
    },
    mutation: {
      addPost: $({title: string, content: string}, Post)
        .let('id', () => $util.autoId())
        .let('userId', () => $util.autoId() /* TODO: get from user context */)
        .call('user', params => props.postStore.put(params))
        .return('user')
    }
  });

  const getUser = new Function(scope, 'getUser', {
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
    userApiFragment,
    userStore,
  };
};

export class Post extends Record({
  id: ID,
  title: string,
  content: string,
  userId: ID
}) {
  public static readonly [FQN]: 'Post' = 'Post';
}

export class PostStore extends DynamoDB.Table.NewType({
  data: Post,
  key: {
    partition: 'id'
  }
}) {}

export interface PostApiProps {
  /**
   * @default - Post
   */
  typeName?: string;
}

export const PostApi = (scope: Scope) => {
  const postStore = new PostStore(scope, 'PostStore');

  const postApiFragment = ApiFragment.new({
    import: [
      /**
       * Import the Post Type.
       */
      Post
    ],
    resolvers: {
      Post: post => ({
        relatedPosts: $(Post)
          .call('post', () => getPostFn.invoke(post.title))
          .return('post')
      })
    },
    query: {
      getPost: $({id: ID}, Post)
        .call('post', ({id}) => getPostFn.invoke(id))
        .return('post')
    }
  });

  const getPostFn = new Function(scope, 'getPost', {
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
    postApiFragment,
    postStore,
  };
};


const app = new App();
const stack = app.stack('stack');

const {postApiFragment, postStore, getPostFn} = PostApi(stack);

const {userApiFragment, userStore, getUser} = UserApi(stack, {
  postStore
});

export type Static<T> = T;
export interface MyApi extends Static<typeof MyApi> {}
const MyApi = Api.from(ApiFragment.join(
  userApiFragment,
  postApiFragment
));


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

