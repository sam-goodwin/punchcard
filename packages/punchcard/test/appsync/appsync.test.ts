import 'jest';

import { array, boolean, integer, nothing, number, optional, Pointer, Record, RecordMembers, RecordShape, RecordType, set, Shape, Static, string, StringShape, timestamp, Value } from '@punchcard/shape';
import { VFunction } from '@punchcard/shape/lib/function';
import { $appsync, $else, $if, $var, ID, Impl, Interface, VFloat } from '../../lib/appsync';
import { Api } from '../../lib/appsync/api';
import { ApiFragment } from '../../lib/appsync/api/api-fragment';
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
  tags: array(string)
}) {}

export class PostStore extends DynamoDB.Table.NewType({
  data: Post,
  key: {
    partition: 'id'
  }
}) {}

/**
 * A user record exposes a feed of `Post`.
 */
export const FeedTrait = Trait({
  feed: array(Post)
});

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
      stringOrNumber: union(string, number),
      list: array(set(string))
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

class Author extends Record({
  name: string
}) {}
class Color extends Record({
  color: string
}) {}

const Book = Interface({
  /**
   * Title of the book.
   */
  title: optional(string),
  author: string
});

const Bird = Interface({
  wings: boolean
});

class BirdBook extends Impl(Book, Bird)({
  key: string
}) {}

class ColoringBook extends Impl(Book)({
  colors: array(Color)
}) {}

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
        return yield* userStore.put({
          id: yield* $util.autoId(),
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
      resolve: request => userStore.get({
        id: request.id
      })
      // or:
      // *resolve({id}) {
      //   return yield* userStore.get({id});
      // }
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
      // *resolve(args) {
      //   return yield* postStore.get({
      //     id: args.id
      //   });
      // }
      resolve: request => postStore.get({
        id: request.id
      })
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

        return yield* postStore.put({
          id,
          title: input.title,
          content: input.content,
          timestamp,
          channel: 'category',
          tags: []
        });
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
          condition: (item) => $if(input.id.isNotEmpty(), function*() {
            return item.id.equals(input.id);
          }, $else(function*() {
            throw $util.error('');
          })),
          *transaction(item) {
            // set content to the new value if it is not null
            yield* input.content.match(string, item.content.set); // short-form
            yield* $if($util.isNotNull(input.title), function*() {
              yield* item.title.set(input.title.as(string));
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

  // const relatedPostIndex = postStore.globalIndex({
  //   indexName: 'related-posts',
  //   key: {
  //     partition: 'category',
  //     sort: 'timestamp'
  //   }
  // });

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
    postApi: ApiFragment.concat(
      postQueries,
      postMutations,
      relatedPosts,
      postSubscriptions
    )
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
  types: ApiFragment.concat(
    createUser,
    getUser,
    postApi
  ),
  caching: {
    behavior: CachingBehavior.PER_RESOLVER_CACHING,
    instanceType: CachingInstanceType.T2_SMALL,
    ttl: 60,
    resolvers: {
      Query: {
        getPost: {
          keys: [
            'id'
          ]
        }
      }
    }
  }
});

import assert = require('@aws-cdk/assert');
import { literal } from '@punchcard/shape/lib/literal';
import { union, UnionShape } from '@punchcard/shape/lib/union';
import { DynamoDSL } from '../../lib/dynamodb/dsl/dynamo-repr';


Build.resolve(MyApi.resource);
const _stack = Build.resolve(stack);

it('should generate schema', () => {
  assert.expect(_stack).toMatch({
    "Resources": {
      "MyApi49610EDF": {
        "Type": "AWS::AppSync::GraphQLApi",
        "Properties": {
          "AuthenticationType": "API_KEY",
          "Name": "MyApi"
        }
      },
      "MyApiSchema552ABCAD": {
        "Type": "AWS::AppSync::GraphQLSchema",
        "Properties": {
          "ApiId": {
            "Fn::GetAtt": [
              "MyApi49610EDF",
              "ApiId"
            ]
          },
          "Definition": "schema {\n  Query: Query,\n  Mutation: Mutation\n}\ntype Post {\n  id: ID!\n  title: String!\n  content: String!\n  category: String!\n  timestamp: Timestamp!\n  relatedPosts: [Post!]!\n}\ntype User {\n  id: ID!\n  alias: String!\n}\ntype Query {\n  getPost(id: ID!): Post!\n  getUser(id: ID!): User!\n}\ntype Mutation {\n  createUser(alias: String!): User!\n  createPost(title: String!,content: String!): Post!\n}"
        }
      },
      "MyApiDataSourcesPostrelatedPostsRole1DDBBCE5": {
        "Type": "AWS::IAM::Role",
        "Properties": {
          "AssumeRolePolicyDocument": {
            "Statement": [
              {
                "Action": "sts:AssumeRole",
                "Effect": "Allow",
                "Principal": {
                  "Service": "appsync.amazonaws.com"
                }
              }
            ],
            "Version": "2012-10-17"
          }
        }
      },
      "MyApiDataSourcesQuerygetPostRoleD38590BA": {
        "Type": "AWS::IAM::Role",
        "Properties": {
          "AssumeRolePolicyDocument": {
            "Statement": [
              {
                "Action": "sts:AssumeRole",
                "Effect": "Allow",
                "Principal": {
                  "Service": "appsync.amazonaws.com"
                }
              }
            ],
            "Version": "2012-10-17"
          }
        }
      },
      "MyApiDataSourcesQuerygetUserRoleFB94ADCF": {
        "Type": "AWS::IAM::Role",
        "Properties": {
          "AssumeRolePolicyDocument": {
            "Statement": [
              {
                "Action": "sts:AssumeRole",
                "Effect": "Allow",
                "Principal": {
                  "Service": "appsync.amazonaws.com"
                }
              }
            ],
            "Version": "2012-10-17"
          }
        }
      },
      "MyApiDataSourcesMutationcreateUserRole97B3D806": {
        "Type": "AWS::IAM::Role",
        "Properties": {
          "AssumeRolePolicyDocument": {
            "Statement": [
              {
                "Action": "sts:AssumeRole",
                "Effect": "Allow",
                "Principal": {
                  "Service": "appsync.amazonaws.com"
                }
              }
            ],
            "Version": "2012-10-17"
          }
        }
      },
      "MyApiDataSourcesMutationcreatePostRole70B0E6A9": {
        "Type": "AWS::IAM::Role",
        "Properties": {
          "AssumeRolePolicyDocument": {
            "Statement": [
              {
                "Action": "sts:AssumeRole",
                "Effect": "Allow",
                "Principal": {
                  "Service": "appsync.amazonaws.com"
                }
              }
            ],
            "Version": "2012-10-17"
          }
        }
      },
      "GetRelatedPostsServiceRoleAB59E692": {
        "Type": "AWS::IAM::Role",
        "Properties": {
          "AssumeRolePolicyDocument": {
            "Statement": [
              {
                "Action": "sts:AssumeRole",
                "Effect": "Allow",
                "Principal": {
                  "Service": "lambda.amazonaws.com"
                }
              }
            ],
            "Version": "2012-10-17"
          },
          "ManagedPolicyArns": [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    "Ref": "AWS::Partition"
                  },
                  ":iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
                ]
              ]
            }
          ]
        }
      },
      "GetRelatedPosts45E2F422": {
        "Type": "AWS::Lambda::Function",
        "Properties": {
          "Code": {
            "ZipFile": "exports.handler = function(){ throw new Error(\"Mocked code is running, oops!\");}"
          },
          "Handler": "index.handler",
          "Role": {
            "Fn::GetAtt": [
              "GetRelatedPostsServiceRoleAB59E692",
              "Arn"
            ]
          },
          "Runtime": "nodejs10.x",
          "Environment": {
            "Variables": {
              "is_runtime": "true",
              "entrypoint_id": "1"
            }
          }
        },
        "DependsOn": [
          "GetRelatedPostsServiceRoleAB59E692"
        ]
      },
      "DataSourcePostrelatedPosts": {
        "Type": "AWS::AppSync::DataSource",
        "Properties": {
          "ApiId": {
            "Fn::GetAtt": [
              "MyApi49610EDF",
              "ApiId"
            ]
          },
          "Name": "Post_relatedPosts1",
          "Type": "AWS_LAMBDA",
          "LambdaConfig": {
            "LambdaFunctionArn": {
              "Fn::GetAtt": [
                "GetRelatedPosts45E2F422",
                "Arn"
              ]
            }
          },
          "ServiceRoleArn": {
            "Fn::GetAtt": [
              "MyApiDataSourcesPostrelatedPostsRole1DDBBCE5",
              "Arn"
            ]
          }
        }
      },
      "FunctionPostrelatedPosts": {
        "Type": "AWS::AppSync::FunctionConfiguration",
        "Properties": {
          "ApiId": {
            "Fn::GetAtt": [
              "MyApi49610EDF",
              "ApiId"
            ]
          },
          "DataSourceName": "Post_relatedPosts1",
          "FunctionVersion": "2018-05-29",
          "Name": "Post_relatedPosts1",
          "RequestMappingTemplate": "$context.source.id",
          "ResponseMappingTemplate": "#set($context.stash.var1 = $context.prev.result)\n"
        }
      },
      "ResolvePostrelatedPosts": {
        "Type": "AWS::AppSync::Resolver",
        "Properties": {
          "ApiId": {
            "Fn::GetAtt": [
              "MyApi49610EDF",
              "ApiId"
            ]
          },
          "FieldName": "relatedPosts",
          "TypeName": "Post",
          "Kind": "PIPELINE",
          "PipelineConfig": {
            "Functions": [
              "Post_relatedPosts1"
            ]
          },
          "ResponseMappingTemplate": "$util.toJson($context.stash.var1)"
        }
      },
      "PostStoreE7B00A44": {
        "Type": "AWS::DynamoDB::Table",
        "Properties": {
          "KeySchema": [
            {
              "AttributeName": "id",
              "KeyType": "HASH"
            }
          ],
          "AttributeDefinitions": [
            {
              "AttributeName": "id",
              "AttributeType": "S"
            }
          ],
          "ProvisionedThroughput": {
            "ReadCapacityUnits": 5,
            "WriteCapacityUnits": 5
          }
        },
        "UpdateReplacePolicy": "Retain",
        "DeletionPolicy": "Retain"
      },
      "DataSourceQuerygetPost": {
        "Type": "AWS::AppSync::DataSource",
        "Properties": {
          "ApiId": {
            "Fn::GetAtt": [
              "MyApi49610EDF",
              "ApiId"
            ]
          },
          "Name": "Query_getPost1",
          "Type": "AWS_LAMBDA",
          "DynamoDBConfig": {
            "AwsRegion": {
              "Ref": "AWS::Region"
            },
            "TableName": {
              "Ref": "PostStoreE7B00A44"
            }
          },
          "ServiceRoleArn": {
            "Fn::GetAtt": [
              "MyApiDataSourcesQuerygetPostRoleD38590BA",
              "Arn"
            ]
          }
        }
      },
      "FunctionQuerygetPost": {
        "Type": "AWS::AppSync::FunctionConfiguration",
        "Properties": {
          "ApiId": {
            "Fn::GetAtt": [
              "MyApi49610EDF",
              "ApiId"
            ]
          },
          "DataSourceName": "Query_getPost1",
          "FunctionVersion": "2018-05-29",
          "Name": "Query_getPost1",
          "RequestMappingTemplate": "{\n \"version\": \"2017-02-28\",\n \"operation\": \"GetItem\",\n \"key\": {\n   \"id\": $util.dynamodb.toDynamoDBJson($context.arguments.id)\n }\n}",
          "ResponseMappingTemplate": "#set($context.stash.var1 = $context.prev.result)\n"
        }
      },
      "ResolveQuerygetPost": {
        "Type": "AWS::AppSync::Resolver",
        "Properties": {
          "ApiId": {
            "Fn::GetAtt": [
              "MyApi49610EDF",
              "ApiId"
            ]
          },
          "FieldName": "getPost",
          "TypeName": "Query",
          "Kind": "PIPELINE",
          "PipelineConfig": {
            "Functions": [
              "Query_getPost1"
            ]
          },
          "ResponseMappingTemplate": "$util.toJson($context.stash.var1)"
        }
      },
      "UserStore7DE05EBF": {
        "Type": "AWS::DynamoDB::Table",
        "Properties": {
          "KeySchema": [
            {
              "AttributeName": "id",
              "KeyType": "HASH"
            }
          ],
          "AttributeDefinitions": [
            {
              "AttributeName": "id",
              "AttributeType": "S"
            }
          ],
          "ProvisionedThroughput": {
            "ReadCapacityUnits": 5,
            "WriteCapacityUnits": 5
          }
        },
        "UpdateReplacePolicy": "Retain",
        "DeletionPolicy": "Retain"
      },
      "DataSourceQuerygetUser": {
        "Type": "AWS::AppSync::DataSource",
        "Properties": {
          "ApiId": {
            "Fn::GetAtt": [
              "MyApi49610EDF",
              "ApiId"
            ]
          },
          "Name": "Query_getUser1",
          "Type": "AWS_LAMBDA",
          "DynamoDBConfig": {
            "AwsRegion": {
              "Ref": "AWS::Region"
            },
            "TableName": {
              "Ref": "UserStore7DE05EBF"
            }
          },
          "ServiceRoleArn": {
            "Fn::GetAtt": [
              "MyApiDataSourcesQuerygetUserRoleFB94ADCF",
              "Arn"
            ]
          }
        }
      },
      "FunctionQuerygetUser": {
        "Type": "AWS::AppSync::FunctionConfiguration",
        "Properties": {
          "ApiId": {
            "Fn::GetAtt": [
              "MyApi49610EDF",
              "ApiId"
            ]
          },
          "DataSourceName": "Query_getUser1",
          "FunctionVersion": "2018-05-29",
          "Name": "Query_getUser1",
          "RequestMappingTemplate": "{\n \"version\": \"2017-02-28\",\n \"operation\": \"GetItem\",\n \"key\": {\n   \"id\": $util.dynamodb.toDynamoDBJson($context.arguments.id)\n }\n}",
          "ResponseMappingTemplate": "#set($context.stash.var1 = $context.prev.result)\n"
        }
      },
      "ResolveQuerygetUser": {
        "Type": "AWS::AppSync::Resolver",
        "Properties": {
          "ApiId": {
            "Fn::GetAtt": [
              "MyApi49610EDF",
              "ApiId"
            ]
          },
          "FieldName": "getUser",
          "TypeName": "Query",
          "Kind": "PIPELINE",
          "PipelineConfig": {
            "Functions": [
              "Query_getUser1"
            ]
          },
          "ResponseMappingTemplate": "$util.toJson($context.stash.var1)"
        }
      },
      "DataSourceMutationcreateUser": {
        "Type": "AWS::AppSync::DataSource",
        "Properties": {
          "ApiId": {
            "Fn::GetAtt": [
              "MyApi49610EDF",
              "ApiId"
            ]
          },
          "Name": "Mutation_createUser1",
          "Type": "AWS_LAMBDA",
          "DynamoDBConfig": {
            "AwsRegion": {
              "Ref": "AWS::Region"
            },
            "TableName": {
              "Ref": "UserStore7DE05EBF"
            }
          },
          "ServiceRoleArn": {
            "Fn::GetAtt": [
              "MyApiDataSourcesMutationcreateUserRole97B3D806",
              "Arn"
            ]
          }
        }
      },
      "FunctionMutationcreateUser": {
        "Type": "AWS::AppSync::FunctionConfiguration",
        "Properties": {
          "ApiId": {
            "Fn::GetAtt": [
              "MyApi49610EDF",
              "ApiId"
            ]
          },
          "DataSourceName": "Mutation_createUser1",
          "FunctionVersion": "2018-05-29",
          "Name": "Mutation_createUser1",
          "RequestMappingTemplate": "#set($context.stash.var1 = $util.autoId())\n{\n \"version\": \"2017-02-28\",\n \"operation\": \"PutItem\",\n \"key\": {\n   \"id\": $util.dynamodb.toDynamoDBJson($context.stash.var1)\n },\n \"attributeValues\": {\n   \"alias\": $util.dynamodb.toDynamoDBJson($context.arguments.alias)\n }\n}",
          "ResponseMappingTemplate": "#set($context.stash.var2 = $context.prev.result)\n"
        }
      },
      "ResolveMutationcreateUser": {
        "Type": "AWS::AppSync::Resolver",
        "Properties": {
          "ApiId": {
            "Fn::GetAtt": [
              "MyApi49610EDF",
              "ApiId"
            ]
          },
          "FieldName": "createUser",
          "TypeName": "Mutation",
          "Kind": "PIPELINE",
          "PipelineConfig": {
            "Functions": [
              "Mutation_createUser1"
            ]
          },
          "ResponseMappingTemplate": "$util.toJson($context.stash.var2)"
        }
      },
      "DataSourceMutationcreatePost": {
        "Type": "AWS::AppSync::DataSource",
        "Properties": {
          "ApiId": {
            "Fn::GetAtt": [
              "MyApi49610EDF",
              "ApiId"
            ]
          },
          "Name": "Mutation_createPost1",
          "Type": "AWS_LAMBDA",
          "DynamoDBConfig": {
            "AwsRegion": {
              "Ref": "AWS::Region"
            },
            "TableName": {
              "Ref": "PostStoreE7B00A44"
            }
          },
          "ServiceRoleArn": {
            "Fn::GetAtt": [
              "MyApiDataSourcesMutationcreatePostRole70B0E6A9",
              "Arn"
            ]
          }
        }
      },
      "FunctionMutationcreatePost": {
        "Type": "AWS::AppSync::FunctionConfiguration",
        "Properties": {
          "ApiId": {
            "Fn::GetAtt": [
              "MyApi49610EDF",
              "ApiId"
            ]
          },
          "DataSourceName": "Mutation_createPost1",
          "FunctionVersion": "2018-05-29",
          "Name": "Mutation_createPost1",
          "RequestMappingTemplate": "#set($context.stash.var1 = $util.autoId())\n#set($context.stash.var2 = $util.time.nowISO8601())\n{\n \"version\": \"2017-02-28\",\n \"operation\": \"PutItem\",\n \"key\": {\n   \"id\": $util.dynamodb.toDynamoDBJson($context.stash.var1)\n },\n \"attributeValues\": {\n   \"title\": $util.dynamodb.toDynamoDBJson($context.arguments.title),\n   \"content\": $util.dynamodb.toDynamoDBJson($context.arguments.content),\n   \"category\": {\n     \"S\": \"category\"\n   },\n   \"timestamp\": $util.dynamodb.toDynamoDBJson($context.stash.var2)\n }\n}",
          "ResponseMappingTemplate": "#set($context.stash.var3 = $context.prev.result)\n"
        }
      },
      "ResolveMutationcreatePost": {
        "Type": "AWS::AppSync::Resolver",
        "Properties": {
          "ApiId": {
            "Fn::GetAtt": [
              "MyApi49610EDF",
              "ApiId"
            ]
          },
          "FieldName": "createPost",
          "TypeName": "Mutation",
          "Kind": "PIPELINE",
          "PipelineConfig": {
            "Functions": [
              "Mutation_createPost1"
            ]
          },
          "ResponseMappingTemplate": "$util.toJson($context.stash.var3)"
        }
      }
    }
  });
});
