import 'jest';

import { array, integer, number, optional, Pointer, Record, RecordMembers, RecordShape, Shape, string, StringShape } from '@punchcard/shape';
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

export class PostStore extends DynamoDB.Table.NewType({
  data: type => PostType.Shape,
  key: {
    partition: 'id'
  }
}) {}

export interface PostProps {
  postStore: PostStore,
  getPost?: Function<StringShape, PostType['Shape']>;
}

export class PostType extends TypeConstructor({
  /**
   * ID.
   */
  id: ID,
  /**
   * Title of the Post.
   */
  title: string,
  /**
   * Content of the Post.
   */
  content: string
}) {
  public readonly getPost: Function<StringShape, PostType['Shape']>;

  constructor(scope: Scope, id: string, {getPost, postStore}: PostProps) {
    super(scope, id);

    this.getPost = getPost || new Function(this, 'getPost', {
      request: string,
      response: this.Shape,
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
  }

  public relatedPosts = $(returns => this)
    .resolve('a', () => this.getPost.invoke(this.title))
    .return('a');

  public averageScore = $(returns => number)
    .resolve('a', () => this.getPost.invoke(this.id))
    .return('a');
}

interface PostApiProps<T extends typeof PostType = typeof PostType> {
  /**
   * @default - Post
   */
  typeName?: string;

  Post?: T;
}

export const PostApi = <T extends typeof PostType = typeof PostType>(scope: Scope, props: PostApiProps<T> = {}) => {
  const postStore = new PostStore(scope, 'pet-store');

  const Post = new PostType(scope, 'Post', {
    postStore,
  });

  const query = {
    getPost: $({id: ID}, returns => Post)
      .resolve('post', ({id}) => Post.getPost.invoke(id))
      .return('post')
  };

  const mutation = {
    addPost: $({title: string, content: optional(string)}, returns => Post)
      .resolve('post', ({title, content}) => Post.getPost.invoke(title))
      .return('post')
  };

  return {
    postStore,
    Post,
    graphql: {
      query,
      mutation
    }
  };
};

const app = new App();
const stack = app.stack('stack');

const {Post} = PostApi(stack);

class ExtendedPostType extends PostType {

}

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

