import 'jest';

import { optional, Record, RecordShape, RecordType, string, array } from '@punchcard/shape';
import { $else, $elseIf, $if } from '../../lib/appsync/if';
import { FieldResolver, fieldResolver, Resolved, Resolver } from '../../lib/appsync/resolver/resolver';
import { GraphQL, ID } from '../../lib/appsync/types';
import { $util } from '../../lib/appsync/util';
import { App } from '../../lib/core';
import { Function } from '../../lib/lambda';

import { Api, resolver } from '../../lib/appsync/api';

import DynamoDB = require('../../lib/dynamodb');

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
}) {
  public static relatedPosts = fieldResolver(Post, array(Post))
    .map('id', () => $util.autoId())
    .return(({root, id}) =>  addPostFn.invoke({
      id,
      title: root.title,
      content: root.content,
    }));
}

const myApi = new Api({
  query: {
    getPost: resolver({id: ID}, Post)
      .map('post', ({id}) => getPostFn.invoke(id))
      .return(_ => _.post)
  },
  mutation: {
    addPost: resolver({title: optional(string), content: string}, Post)
      .map('id', () => $util.autoId())
      .return(({id, title, content}) => addPostFn.invoke({
        id,
        title: $if(GraphQL.isNull(title), () =>
          title
        ).$else(() =>
          GraphQL.string('generated title')
        ),
        content
      }))
  }
});

const app = new App();
const stack = app.stack('stack');

const posts = new DynamoDB.Table(stack, 'posts', {
  data: Post,
  key: {
    partition: 'id'
  }
});

export class AddPostRequest extends Record({
  id: optional(string),
  title: string,
  content: string
}) {}

const addPostFn = new Function(stack, 'fn', {
  request: AddPostRequest,
  response: Post,
  depends: posts.readWriteAccess()
}, async (request, posts) => {
  const post = new Post({
    ...request,
    id: request.id || 'random',
  });

  await posts.put(post);

  return post;
});

const getPostFn = new Function(stack, 'fn', {
  request: string,
  response: Post,
  depends: posts.readAccess()
}, async (id, posts) => {
  const p = await posts.get({
    id
  });
  if (p === undefined) {
    throw new Error('not found');
  }
  return p;
});
