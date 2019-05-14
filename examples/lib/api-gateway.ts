import cdk = require('@aws-cdk/cdk');
import punchcard = require('punchcard');
import { $input, integer, response, StatusCode, string } from 'punchcard';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'api-example');

const table = new punchcard.HashTable(stack, 'my-table', {
  partitionKey: 'id',
  shape: {
    id: string(),
    count: integer({
      minimum: 0
    })
  }
});

const executorService = new punchcard.LambdaExecutorService();

const endpoint = executorService.apiIntegration(stack, 'MyEndpoint', {
  context: {
    table
  }
});

const api = new punchcard.Api(stack, 'MyApi');
const resource = api.addResource('count');

resource.setGetMethod({
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
    [punchcard.StatusCode.Ok]: {
      count: integer({
        minimum: 0
      })
    },
    [punchcard.StatusCode.NotFound]: {
      id: string()
    },
    [punchcard.StatusCode.InternalError]: {
      errorMessage: string()
    }
  },

  handle: async ({id}, {table}) => {
    try {
      const item = await table.get({
        id
      });
      if (item) {
        return response(StatusCode.Ok, {
          payload: {
            count: item.count
          }
        });
      } else {
        return response(StatusCode.NotFound, {
          payload: {
            id
          }
        });
      }
    } catch (err) {
      return response(StatusCode.InternalError, {
        payload: {
          errorMessage: err.message
        }
      });
    }
  }
});
