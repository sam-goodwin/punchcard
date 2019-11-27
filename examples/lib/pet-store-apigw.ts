import core = require('@aws-cdk/core');
import uuid = require('uuid');

import { Core, ApiGateway, DynamoDB, Lambda } from 'punchcard';

import { array, double, string, struct } from 'punchcard/lib/shape';

export const app = new Core.App();

// WARNING: this example will be changed - it does not properly descrive the Model and Velocity Templates yet.

const stack = app.root.map(app => new core.Stack(app, 'pet-store', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
}));

const petStore = new DynamoDB.Table(stack, 'pet-store', {
  partitionKey: 'id',
  sortKey: undefined,
  attributes: {
    id: string(),
    type: string(),
    price: double()
  }
});

const executorService = new Lambda.ExecutorService({
  memorySize: 512
});

const endpoint = executorService.apiIntegration(stack, 'MyEndpoint', {
  depends: petStore.readWriteAccess()
});

const api = new ApiGateway.Api(stack, 'PetApi');
const pets = api.addResource('pets');
const pet = pets.addResource('{id}');

// GET /pets
pets.setGetMethod({
  integration: endpoint,
  request: {
    shape: struct({})
  },
  responses: {
    [ApiGateway.StatusCode.Ok]: array(struct(petStore.attributes)),
    [ApiGateway.StatusCode.InternalError]: struct({
      errorMessage: string()
    })
  },
  handle: async (_, petStore) => {
    return ApiGateway.response(ApiGateway.StatusCode.Ok, await petStore.scan());
  }
});

// GET /pets/{id}
pet.setGetMethod({
  integration: endpoint,
  request: {
    shape: struct({
      id: string()
    }),
    mappings: {
      id: ApiGateway.$input.params('id')
    }
  },
  responses: {
    [ApiGateway.StatusCode.Ok]: struct(petStore.attributes),
    [ApiGateway.StatusCode.NotFound]: string(),
    [ApiGateway.StatusCode.InternalError]: struct({
      errorMessage: string()
    })
  },
  handle: async ({id}, petStore) => {
    const item = await petStore.get({
      id
    });
    if (item === undefined) {
      return ApiGateway.response(ApiGateway.StatusCode.NotFound, id);
    }
    return ApiGateway.response(ApiGateway.StatusCode.Ok, item);
  }
});

// POST /pets
pets.setPostMethod({
  integration: endpoint,
  request: {
    shape: struct({
      type: string(),
      price: double()
    })
  },
  responses: {
    [ApiGateway.StatusCode.Ok]: struct({
      id: string()
    }),
    [ApiGateway.StatusCode.Conflict]: string(),
    [ApiGateway.StatusCode.InternalError]: struct({
      errorMessage: string()
    })
  },
  handle: async (request, petStore) => {
    const id = uuid();
    try {
      await petStore.put({
        item: {
          id,
          ...request
        },
        if: item => DynamoDB.attribute_not_exists(item.id)
      });
      return ApiGateway.response(ApiGateway.StatusCode.Ok, {
        id
      });
    } catch (err) {
      const e = err as AWS.AWSError;
      if (e.code === 'ConditionalCheckFailedException') {
        return ApiGateway.response(ApiGateway.StatusCode.Conflict, `item with id ${id} already exists`);
      } else {
        return ApiGateway.response(ApiGateway.StatusCode.InternalError, {
          errorMessage: e.message
        });
      }
    }
  }
});
