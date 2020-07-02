import { Core, DynamoDB, Lambda } from 'punchcard';

import { array, string, Type, optional, } from '@punchcard/shape';
import { ID, Api, Trait, Query, Mutation, Subscription, CachingBehavior, CachingInstanceType, $context, $if } from 'punchcard/lib/appsync';
import { Scope } from 'punchcard/lib/core/construct';
import { Fn } from '@punchcard/shape/lib/function';
import { $util } from 'punchcard/lib/appsync/lang/util';
import { UserPool } from 'punchcard/lib/cognito/user-pool';

/*
type Post {
  id: ID!
  title: string!
  content: string!
  tags: [string!]!
}
*/
class Post extends Type('Post', {
  /**
   * ID of the Post.
   */
  id: ID,
  title: string,
  content: string,
  tags: array(string)
}) {}

/*
"Traits" are like interfaces in TypeScript.

interface PostQueryAPI {
  getPost: (id: ID) => Post
}

They don't have an implementation until you instantiate them. 
*/
const PostQueryAPI = Query({
  getPost: Fn({ id: ID }, Post),
});

const PostMutationApi = Mutation({
  addPost: Fn({ title: string, content: string, tags: array(string) }, Post)
});

const RelatedPostsAPI = Trait(Post, {
  relatedPosts: Fn({ tags: array(string) }, array(Post))
});

const PostSubscriptionsApi = Subscription({
  newPost: optional(Post)
});

// Create a class for our DDB table for storing posts
class PostStore extends DynamoDB.Table.NewType({
  data: Post,
  key: {
    partition: 'id'
  }
}) {}

/*
This is a component function. It creates cloud resources and implements
the API "Traits" we defined above.

A component is a lot like a functional React UI component which takes in some
props, configures some state and renders some HTML nodes. Except, instead
of a DOM, it's a GraphQL API, and instead of UI state, we're creating and
connecting to cloud resources such as DynamoDB Tables and Lambda Functions.

This composition model is designed to scale to a React-like ecosystem for 
Cloud APIs and Applications.
*/
export const PostApi = (
  scope: Scope,
  props: {
    /**
     * Can inject dependencies like DDB tables.
     */
    postStore?: PostStore
  } = {}
) => {
  // init the database
  const postStore = props.postStore || new PostStore(scope, 'PostStore');

  // impl PostQueryAPI on Query (adds the `getPost` resolver function to the root of the API)
  const postQueryApi = new PostQueryAPI({
    getPost: {
      cache: {
        keys: [
          'id'
        ],
        ttl: 60
      },
      *resolve({id}) {
        // this generator function represents AWS AppSync's resolver pipeline
        // you use yield* to issue commands that translate to Velocity Templates
        // and AppSync Resolvers/Functions/DataSources.
  
        // here, we make a call to DynamoDB GetItem and return the result as JSON
        return yield * postStore.get({
          id
        });
      }
    }
  });

  // impl PostMutationAPI on Mutation (adds the `addPost` resolver function to the root of the API)
  const postMutationApi = new PostMutationApi({
    addPost: {
      *resolve(input) {
        return yield* postStore.put({
          id: yield* $util.autoId(),
          ...input
        });
      }
    }
  });

  const postSubscriptionsApi = new PostSubscriptionsApi({
    newPost: {
      subscribe: [
        postMutationApi.subscription('addPost')
      ],
      *resolve() {
        yield* $if($context.identity.username.equalsIgnoreCase('sam'), function*() {
          throw $util.error('sam is not allowed');
        });
      }
    }
  })
  
  // impl RelatedPostsAPI on Post (adds a `relatedPosts` resolver)
  const relatedPostsApi = new RelatedPostsAPI({
    relatedPosts: {
      *resolve({tags}) {
        return yield* fn.invoke(tags);
      }
    }
  });

  // A Lambda Function that we call from the relatedPostsAPI AppSync Resolvers
  const fn = new Lambda.Function(scope, 'GetRelatedPosts', {
    request: array(string),
    response: array(Post)
  }, async (tags) => {
    // dummy lambda function implemementation
    return tags.map(tag => new Post({
      id: 'id',
      title: 'title',
      content: `tag: ${tag}`,
      tags
    }));
  });

  // export thee API implementations
  return {
    postMutationApi,
    postQueryApi,
    postStore,
    postSubscriptionsApi,
    relatedPostsApi,
  }
}

// create a new App
export const app = new Core.App();
const stack = app.stack('graphql');

// instantiate our API component 
const api = PostApi(stack);

const userPool = new UserPool(stack, 'UserPool');

// Configure the API - generates schema and AppSync config (VTL, Resolvers, IAM Roles, etc.).
const MyApi = new Api(stack, 'MyApi', {
  name: 'MyApi',
  // subscribe: {},
  // merge our API fragments into one type-system
  fragments: [
    api.postMutationApi,
    api.postQueryApi,
    api.relatedPostsApi,
    api.postSubscriptionsApi
  ] as const,
  userPool,
  caching: {
    behavior: CachingBehavior.PER_RESOLVER_CACHING,
    instanceType: CachingInstanceType.T2_SMALL,
    ttl: 60,
  }
});
