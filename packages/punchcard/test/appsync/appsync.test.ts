import 'jest';

import { array, integer, optional, Pointer, Record, RecordMembers, RecordShape, Shape, string, StringShape } from '@punchcard/shape';
import { Do } from 'fp-ts-contrib/lib/Do';
import { foldFree, free } from 'fp-ts-contrib/lib/Free';
import { identity, Identity } from 'fp-ts/lib/Identity';
import { VInterpreter } from '../../lib/appsync';
import { GraphQLApi } from '../../lib/appsync/api';
import { Mutation } from '../../lib/appsync/decorators';
import { Resolved } from '../../lib/appsync/syntax';
import { $if } from '../../lib/appsync/syntax/if';
import { $mutation } from '../../lib/appsync/syntax/mutation';
import { $ } from '../../lib/appsync/syntax/resolver';
import { ID, VObject } from '../../lib/appsync/types';
import { GraphQLType, TypeConstructor } from '../../lib/appsync/types/type-constructor';
import { VTL } from '../../lib/appsync/types/vtl';
import { $util } from '../../lib/appsync/util';
import { App, Dependency } from '../../lib/core';
import { Build } from '../../lib/core/build';
import { Scope } from '../../lib/core/construct';
import DynamoDB = require('../../lib/dynamodb');
import { Function } from '../../lib/lambda';

class Post extends Record({
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
}) {}

export class PostStore extends DynamoDB.Table.NewType({
  data: Post,
  key: {
    partition: 'id'
  }
}) {}

interface PostApiProps {
  /**
   * @default - Post
   */
  typeName?: string;
}

export const PostApi = (scope: Scope, props: PostApiProps = {}) => {
  const PostType = GraphQLType({
    self: Post,
    typeName: props.typeName,
    fields: self => ({
      relatedPosts: $({id: string}, string)
        .resolve('a', ({id}) => getPost.invoke(self.id))
        .return('id')
      ,

      averageScore: $({}, string)
        .resolve('a', () => getPost.invoke(self.id))
        .return('a')
      ,
    })
  });

  const postStore = new PostStore(scope, 'pet-store');

  const getPost = new Function(scope, 'getPostFn', {
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

  const query = {
    getPost: $({id: ID}, PostType)
      .resolve('post', ({id}) => getPost.invoke(id))
      .return('post')
  };

  const mutation = {
    addPost: $({title: string, content: optional(string)}, PostType)
      .resolve('post', ({title, content}) => getPost.invoke(title))
      .return('post')
  };

  return {
    PostType,
    getPost,
    postStore,
    graphql: {
      query,
      mutation
    }
  };
};

const app = new App();
const stack = app.stack('stack');

const postApi = PostApi(stack);

// export class Post extends PostType.Record {}

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

