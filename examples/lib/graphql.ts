import { Core, DynamoDB, Lambda } from 'punchcard';

import { array, string, integer, Record, any, Shape, Minimum } from '@punchcard/shape';
import { ID, Api, Trait, Query, Mutation, Subscription } from 'punchcard/lib/appsync';
import { Scope } from 'punchcard/lib/core/construct';
import { VFunction } from '@punchcard/shape/lib/function';
import { ApiFragment } from 'punchcard/lib/appsync/api/api-fragment';
import { $util } from 'punchcard/lib/appsync/lang/util/util';

/*
type Post {
  id: ID!
  title: string!
  content: string!
  tags: [string!]!
}
*/
class Post extends Record('Post', {
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
  getPost: VFunction({
    args: { id: ID },
    returns: Post
  }),
});

const PostMutationAPI = Mutation({
  addPost: VFunction({
    args: { title: string, content: string, tags: array(string) },
    returns: Post
  })
});

const RelatedPostsAPI = Trait({
  relatedPosts: VFunction({
    args: {
      tags: array(string)
    },
    returns: array(Post)
  })
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
  const postMutationAPI = new PostMutationAPI({
    addPost: {
      *resolve(input) {
        const id = yield* $util.autoId();
  
        const post = yield* postStore.put({
          id,
          ...input
        });
  
        return post;
      }
    }
  });
  
  // impl RelatedPostsAPI on Post (adds a `relatedPosts` resolver)
  const relatedPostsApi = new RelatedPostsAPI(Post, {
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
    postStore,
    postQueryApi,
    postMutationAPI,
    relatedPostsApi
  }
}

// create a new App
export const app = new Core.App();
const stack = app.stack('graphql');

// instantiate our API component 
const {
  postMutationAPI,
  postQueryApi,
  relatedPostsApi
} = PostApi(stack);

// Configure the API - generates schema and AppSync config (VTL, Resolvers, IAM Roles, etc.).
const MyApi = new Api(stack, 'MyApi', {
  name: 'MyApi',
  // merge our API fragments into one type-system
  types: ApiFragment.concat(
    postMutationAPI,
    postQueryApi,
    relatedPostsApi
  ),
  subscribe: [],
  userPool: null as any
});

