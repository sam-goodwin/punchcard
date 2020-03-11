// https://docs.aws.amazon.com/appsync/latest/devguide/tutorials.html#aws-appsync-tutorials

import { array, ArrayShape, int, IntegerShape, MapShape, NumberShape, optional, Record, RecordMembers, RecordShape, RecordType, Shape, ShapeOrRecord, string, StringShape, Trait, Value } from "@punchcard/shape";

import 'reflect-metadata';

import tl = require('typelevel-ts');



/*
schema {
  query: Query
  mutation: Mutation
}

type Query {
  getPost(id:ID!): Post
  allPosts: [Post]
}

type Mutation {
  addPost(id: ID!, author: String!, title: String, content: String, url: String): Post!
}

type Post {
  id: ID!
  author: String!
  title: String
  content: String
  url: String
  ups: Int
  downs: Int
  relatedPosts: [Post]
}
*/
