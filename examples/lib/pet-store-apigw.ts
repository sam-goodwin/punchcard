import core = require('@aws-cdk/core');
import uuid = require('uuid');

import { Core, ApiGateway, DynamoDB, Lambda } from 'punchcard';

import { array, string, Shape, number, Minimum } from '@punchcard/shape';
import { Record } from '@punchcard/shape';

export const app = new Core.App();

// WARNING: this example will be changed - it does not properly descrive the Model and Velocity Templates yet.

const stack = app.root.map(app => new core.Stack(app, 'pet-store'));

class PetRecord extends Record({
  id: string,
  type: string,
  price: number
}) {}

const petStore = new DynamoDB.Table(stack, 'pet-store', PetRecord, 'id');

const executorService = new Lambda.ExecutorService({
  memorySize: 512
});

const endpoint = executorService.apiIntegration(stack, 'MyEndpoint', {
  depends: petStore.readWriteAccess()
});

const api = new ApiGateway.Api(stack, 'PetApi');
const pets = api.addResource('pets');
const pet = pets.addResource('{id}');

class ErrorResponse extends Record({
  errorMessage: string
}) {}

class EmptyPayload extends Record({}) {}

// GET /pets
pets.setGetMethod({
  integration: endpoint,
  request: {
    shape: EmptyPayload
  },
  responses: {
    [ApiGateway.StatusCode.Ok]: array(petStore.attributesType),
    [ApiGateway.StatusCode.InternalError]: Shape.of(ErrorResponse)
  },
  handle: async (_, petStore) => {
    return ApiGateway.response(ApiGateway.StatusCode.Ok, await petStore.scan());
  }
});

class PetId extends Record({
  id: string
}) {}

// GET /pets/{id}
pet.setGetMethod({
  integration: endpoint,
  request: {
    shape: PetId,
    mappings: {
      id: ApiGateway.$input.params('id')
    }
  },
  responses: {
    [ApiGateway.StatusCode.Ok]: petStore.attributesShape,
    [ApiGateway.StatusCode.NotFound]: string,
    [ApiGateway.StatusCode.InternalError]: Shape.of(ErrorResponse)
  },
  handle: async ({id}, petStore) => {
    const item = await petStore.get(id);
    if (item === undefined) {
      return ApiGateway.response(ApiGateway.StatusCode.NotFound, id);
    }
    return ApiGateway.response(ApiGateway.StatusCode.Ok, item);
  }
});

class AddPetRequest extends Record({
  type: string,
  price: number
    .apply(Minimum(0))
}) {}

// POST /pets
pets.setPostMethod({
  integration: endpoint,
  request: {
    shape: AddPetRequest
  },
  responses: {
    [ApiGateway.StatusCode.Ok]: Shape.of(PetId),
    [ApiGateway.StatusCode.Conflict]: string,
    [ApiGateway.StatusCode.InternalError]: Shape.of(ErrorResponse)
  },
  handle: async (request, petStore) => {
    const id = uuid();
    try {
      await petStore.putIf(new PetRecord({ id, ...request }), item => item.id.notExists());
      return ApiGateway.response(ApiGateway.StatusCode.Ok, new PetId({
        id
      }));
    } catch (err) {
      const e = err as AWS.AWSError;
      if (e.code === 'ConditionalCheckFailedException') {
        return ApiGateway.response(ApiGateway.StatusCode.Conflict, `item with id ${id} already exists`);
      } else {
        return ApiGateway.response(ApiGateway.StatusCode.InternalError, new ErrorResponse({
          errorMessage: e.message
        }));
      }
    }
  }
});
