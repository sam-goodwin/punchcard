import 'jest';

import { array, integer, map, nothing, number, optional, Pointer, Record, RecordShape, RecordType, set, Shape, Static, string, StringShape, timestamp, union, Value } from '@punchcard/shape';
import { VFunction } from '@punchcard/shape/lib/function';
import { $if, ID, VTL } from '../../lib/appsync';
import { Api } from '../../lib/appsync/api';
import { CachingBehavior, CachingInstanceType } from '../../lib/appsync/api/caching';
import { Mutation } from '../../lib/appsync/api/mutation';
import { Query } from '../../lib/appsync/api/query';
import { Subscription } from '../../lib/appsync/api/subscription';
import { Trait } from '../../lib/appsync/api/trait';
import { $util } from '../../lib/appsync/lang/util';
import { UserPool } from '../../lib/cognito/user-pool';
import { App } from '../../lib/core';
import { Build } from '../../lib/core/build';
import { Scope } from '../../lib/core/construct';
import DynamoDB = require('../../lib/dynamodb');
import Lambda = require('../../lib/lambda');

import assert = require('@aws-cdk/assert');
import { DynamoDSL } from '../../lib/dynamodb/dsl/dynamo-repr';

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
 * Query for getting Users.
 *
 * @typeparam T type to bind this trait to.
 */
export const GetUserTrait = Query({
  /**
   * Get User by ID.
   */
  getUser: VFunction({
    args: { id: ID },
    returns: User
  })
});

/**
 * Mutation for creating Users.
 */
export const CreateUserTrait = Mutation({
  createUser: VFunction({
    args: { alias: string },
    returns: User
  })
});

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
  channel: string,
  timestamp,
  tags: set(string)
}) {}

export class PostStore extends DynamoDB.Table.NewType({
  data: Post,
  key: {
    partition: 'id'
  }
}) {}

export const GetPostTrait = Query({
  getPost: VFunction({
    args: { id: ID, },
    returns: Post
  })
});

export const PostMutations = Mutation({
  /**
   * Function documentation goes here.
   */
  createPost: VFunction({
    args: {
      title: string,
      content: string,
    },
    returns: Post
  }),

  updatePost: VFunction({
    args: {
      id: ID,
      title: optional(string),
      content: optional(string),
      tags: optional(array(string))
    },
    returns: Post
  }),
});

export const RelatedPostsTrait = Trait({
  relatedPosts: array(Post)
});

export const PostSubscriptions = Subscription({
  newPost: Post
});

/**
 * User API component - implements the query, mutation resolvers for Users.
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
    createUser: {
      auth: {
        aws_cognito_user_pools: {
          groups: ['Writer']
        }
      },
      *resolve(request) {
        const id = yield* $util.autoId();

        return yield* userStore.put({
          id,
          alias: request.alias,
        });
      }
    }
  });

  const getUser = new GetUserTrait({
    getUser: {
      auth: {
        aws_cognito_user_pools: {
          groups: ['Reader']
        }
      },
      cache: {
        ttl: 60,
        keys: [
          'id'
        ]
      },
      *resolve({id}) {
        return yield* userStore.get({
          id
        });
      }
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

  const postQueries = new GetPostTrait({
    getPost: {
      auth: {
        aws_cognito_user_pools: {
          groups: [
            'Write'
          ]
        }
      },
      cache: {
        keys: [
          'id'
        ],
        ttl: 60
      },
      *resolve(request) {
        return yield* postStore.get({
          id: request.id
        });
      }
    }
  });

  const postMutations = new PostMutations({
    createPost: {
      auth: {
        aws_cognito_user_pools: {
          groups: [
            'Write'
          ]
        }
      },

      *resolve(input) {
        const id = yield* $util.autoId();
        const timestamp = yield* $util.time.nowISO8601();

        const post = yield* postStore.put({
          id,
          title: input.title,
          content: yield* $if($util.isNull(input.content), () =>
            VTL.string('content'),
          ).else(function*() {
            return input.content;
          }),
          timestamp,
          channel: 'category',
          tags: [],
        });

        return post;
      }
    },

    updatePost: {
      auth: {
        aws_cognito_user_pools: {
          groups: [
            'Write'
          ]
        }
      },

      *resolve(input) {
        return yield* postStore.update({
          key: {
            id: input.id
          },
          *condition(item) {
            yield* $if(input.id.equalsIgnoreCase('sam'), function*() {
              yield* DynamoDSL.expect(item.id.equals('sam').and(item.tags.size.gt(0)));
            });
          },
          *transaction(item) {
            yield* input.title.match(string, function*(title) {
              yield* item.title.set(title);
            });
          },
        });
      }
    }
  });

  const postSubscriptions = new PostSubscriptions({
    newPost: {
      auth: {
        aws_cognito_user_pools: {
          groups: [
            'Reader'
          ],
        }
      },
      subscribe: [
        postMutations.subscription('createPost')
      ],
    }
  });

  const relatedPosts = new RelatedPostsTrait(Post, {
    relatedPosts: {
      auth: {
        aws_cognito_user_pools: {
          groups: [
            'Reader'
          ]
        }
      },
      *resolve() {
        return yield* getRelatedPosts.invoke(this.id);
      }
    }
  });

  const getRelatedPosts = new Lambda.Function(scope, 'GetRelatedPosts', {
    request: string,
    response: array(Post)
  }, async (request) => [
    // todo
  ] as any);

  return {
    postStore,
    postApi: [
      postQueries,
      postMutations,
      relatedPosts,
      postSubscriptions
    ]
  };
};

const app = new App();
const stack = app.stack('stack');

const userPool = new UserPool(stack, 'UserPool', {
  requiredAttributes: {
    email: true,
    birthdate: true
  },
  signInAliases: {
    email: true,
    preferredUsername: true,
  },
  customAttributes: {
    favoriteNumber: integer
  },
});

const { postApi, postStore } = PostApi(stack);

const { createUser, getUser, userStore } = UserApi(stack, {
  postStore
});

export interface MyApi extends Static<typeof MyApi> {}

// instantiate an API with that type system
const MyApi = new Api(stack, 'MyApi', {
  name: 'MyApi',
  // authorize with this user pool
  userPool,
  fragments: [
    createUser,
    getUser,
    ...postApi
  ],
  caching: {
    behavior: CachingBehavior.PER_RESOLVER_CACHING,
    instanceType: CachingInstanceType.T2_SMALL,
    ttl: 60,
  }
});


it('should', () => {
  Build.resolve(MyApi.resource);
  const _stack = Build.resolve(stack);
});
