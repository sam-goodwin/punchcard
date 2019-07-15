import core = require('@aws-cdk/core');
import punchcard = require('punchcard');
import uuid = require('uuid');

import { $input, array, attribute_not_exists, double, response, StatusCode, string, struct } from 'punchcard';

const app = new core.App();
export default app;

// WARNING: this example will be changed - it does not properly descrive the Model and Velocity Templates yet.

const stack = new core.Stack(app, 'pet-store');

const petStore = new punchcard.HashTable(stack, 'pet-store', {
  partitionKey: 'id',
  shape: {
    id: string(),
    type: string(),
    price: double()
  }
});

const executorService = new punchcard.LambdaExecutorService({
  memorySize: 512
});

const endpoint = executorService.apiIntegration(stack, 'MyEndpoint', {
  depends: petStore
});

const api = new punchcard.Api(stack, 'PetApi');
const pets = api.addResource('pets');
const pet = pets.addResource('{id}');

// GET /pets
pets.setGetMethod({
  integration: endpoint,
  request: {
    shape: {}
  },
  responses: {
    [StatusCode.Ok]: array(struct(petStore.shape)),
    [StatusCode.InternalError]: struct({
      errorMessage: string()
    })
  },
  handle: async (_, petStore) => {
    return response(StatusCode.Ok, await petStore.scan());
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
      id: $input.params('id')
    }
  },
  responses: {
    [StatusCode.Ok]: struct(petStore.shape),
    [StatusCode.NotFound]: string(),
    [StatusCode.InternalError]: struct({
      errorMessage: string()
    })
  },
  handle: async ({id}, petStore) => {
    const item = await petStore.get({
      id
    });
    if (item === undefined) {
      return response(StatusCode.NotFound, id);
    }
    return response(StatusCode.Ok, item);
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
    [StatusCode.Ok]: struct({
      id: string()
    }),
    [StatusCode.Conflict]: string(),
    [StatusCode.InternalError]: struct({
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
        if: item => attribute_not_exists(item.id)
      });
      return response(StatusCode.Ok, {
        id
      });
    } catch (err) {
      const e = err as AWS.AWSError;
      if (e.code === 'ConditionalCheckFailedException') {
        return response(StatusCode.Conflict, `item with id ${id} already exists`);
      } else {
        return response(StatusCode.InternalError, {
          errorMessage: e.message
        });
      }
    }
  }
});
