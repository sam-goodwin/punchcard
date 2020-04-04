import { Core, DynamoDB, Lambda } from 'punchcard';

import { array, string, integer, Record, any, Shape, Minimum } from '@punchcard/shape';
import { CDK } from 'punchcard/lib/core/cdk';
import { ID, Trait, $util, Api, ApiFragment } from 'punchcard/lib/appsync';
import { Scope } from 'punchcard/lib/core/construct';
import { VFunction } from '@punchcard/shape/lib/function';

/*
schema {
  Query: Query,
  Mutation: Mutation
}
*/
class Query extends Record('Query', {}) {}
class Mutation extends Record('Mutation', {}) {}

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
input PostInput {
  title: string!
  content: string!
  tags: [string!]!
}
*/
class PostInput extends Post.Omit('PostInput', [
  'id'
]) {}

/*
"Traits" are like interfaces in TypeScript.

interface PostQueryAPI {
  getPost: (id: ID) => Post
}

They don't have an implementation until you instantiate
them from within a component. 
*/
const PostQueryAPI = Trait({
  getPost: VFunction({
    args: { id: ID },
    returns: Post
  }),
});
const PostMutationAPI = Trait({
  addPost: VFunction({
    args: { input: PostInput },
    returns: Post
  })
})
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
the API "Traits" we defined above.e

Punchcard thinks of the GraphQL type system like a DOM. It's a big graph
with types connected by fields. A component, then, is simply a function
that returns "API Components".
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
  const postQueryApi = new PostQueryAPI(Query, {
    *getPost({id}) {
      // this generator function represents AWS AppSync's resolver pipeline
      // you use yield* to issue commands that translate to Velocity Templates
      // and AppSync Resolvers/Functions/DataSources.

      // here, we make a call to DynamoDB GetItem and return the result as JSON
      return yield * postStore.get({
        id
      });
    }
  });

  // impl PostMutationAPI on Mutation (adds the `addPost` resolver function to the root of the API)
  const postMutationAPI = new PostMutationAPI(Mutation, {
    *addPost({input}) {
      const id = yield* $util.autoId();

      const post = yield* postStore.put({
        id,
        ...input
      });

      return post;
    }
  });
  
  // impl RelatedPostsAPI on Post (adds a `relatedPosts` resolver)
  const relatedPostsApi = new RelatedPostsAPI(Post, {
    *relatedPosts({tags}) {
      return yield* fn.invoke(tags);
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
const stack = app.stack('invoke-function');

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
  types: ApiFragment.join(
    postMutationAPI,
    postQueryApi,
    relatedPostsApi
  ),

  // specify the FQN (fully-qualified name) of the type
  // that is the root of the Query API
  query: 'Query',

  // same for mutations
  mutation: 'Mutation'
});

