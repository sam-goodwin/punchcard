import core = require('@aws-cdk/core');
import uuid = require('uuid');

import { ApiGateway, Shape, DynamoDB, Lambda } from 'punchcard';

const { array, double, string, struct } = Shape;

const app = new core.App();
export default app;

// WARNING: this example will be changed - it does not properly descrive the Model and Velocity Templates yet.

const stack = new core.Stack(app, 'pet-store');

const petStore = new DynamoDB.Table(stack, 'pet-store', {
  partitionKey: 'id',
  sortKey: undefined,
  shape: {
    id: string(),
    type: string(),
    price: double()
  }
});

const executorService = new Lambda.ExecutorService({
  memorySize: 512
});

const endpoint = executorService.apiIntegration(stack, 'MyEndpoint', {
  depends: petStore
});

const api = new ApiGateway.Api(stack, 'PetApi');
const pets = api.addResource('pets');
const pet = pets.addResource('{id}');

// GET /pets
pets.setGetMethod({
  integration: endpoint,
  request: {
    shape: {}
  },
  responses: {
    [ApiGateway.StatusCode.Ok]: array(struct(petStore.shape)),
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
    shape: {
      id: string()
    },
    mappings: {
      id: ApiGateway.$input.params('id')
    }
  },
  responses: {
    [ApiGateway.StatusCode.Ok]: struct(petStore.shape),
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
    shape: {
      type: string(),
      price: double()
    }
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
