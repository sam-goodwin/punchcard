import cdk = require('@aws-cdk/cdk');
import 'jest';
import sinon = require('sinon');

import { Client, Function } from '../../../lib';
import { setRuntime } from '../../../lib/constants';

// stop web-pack from running
// TODO: gross as fuck - every user will have to do this
setRuntime();

describe('Function', () => {
  it('should install clients in context', () => {
    const stack = new cdk.Stack(new cdk.App(), 'stack');
    const client: Client<any> = {
      install: target => target.properties.set('test', 'value'),
      bootstrap: () => null
    };
    const f = new Function(stack, 'function', {
      clients: {
        client
      },
      handle: null as any
    });
    expect((f as any).environment[`${f.node.uniqueId}_client_test`]).toEqual('value');
  });
  it('should bootstrap all clients on boot and pass to handler', async () => {
    const stack = new cdk.Stack(new cdk.App(), 'stack');
    const client: Client<any> = {
      install: target => target.properties.set('test', 'value'),
      bootstrap: () => 'client'
    };
    const fake = sinon.fake();
    const f = new Function(stack, 'function', {
      clients: {
        client
      },
      handle: fake
    });
    const handler = await f.boot();
    await handler(null, null);
    expect(fake.calledOnceWithExactly(null, {client: 'client'}, null)).toBe(true);
  });
  it('should use requestMapper to read input and responseMapper to write output', async () => {
    const stack = new cdk.Stack(new cdk.App(), 'stack');
    const mapper = {
      read: sinon.fake.returns('deserialized'),
      write: sinon.fake.returns('serialized')
    };
    const handle = sinon.fake.returns('response');
    const f = new Function(stack, 'function', {
      requestMapper: mapper,
      responseMapper: mapper,
      handle
    });
    const handler = await f.boot();
    const response = await handler('request', null);
    expect(response).toEqual('serialized');
    expect(mapper.read.calledOnceWithExactly('request')).toBe(true);
    expect(handle.calledOnceWith('deserialized')).toBe(true);
    expect(mapper.write.calledOnceWithExactly('response')).toBe(true);
  });
});
describe('Function.Client', () => {
  it('invoke should invoke function, using request/response mapper to read/write request/response', async () => {
    const client = {
      invoke: sinon.fake.returns({
        promise: () => Promise.resolve({
          StatusCode: 200,
          Payload: 'responseSerialized'
        })
      })
    };
    const requestMapper = {
      write: sinon.fake.returns('requestSerialized')
    };
    const responseMapper = {
      read: sinon.fake.returns('response')
    };
    const f = new Function.Client(
      client as any,
      'arn',
      requestMapper as any,
      responseMapper as any
    );
    const response = await f.invoke('request');
    expect(requestMapper.write.calledOnceWithExactly('request')).toBe(true);
    expect(client.invoke.calledOnceWithExactly({
      FunctionName: 'arn',
      InvocationType: 'RequestResponse',
      Payload: 'requestSerialized'
    })).toBe(true);
    expect(responseMapper.read.calledOnceWithExactly('responseSerialized')).toBe(true);
    expect(response).toEqual('response');
  });
  it('invoke should handle Buffer in returned payload', async () => {
    const client = {
      invoke: sinon.fake.returns({
        promise: () => Promise.resolve({
          StatusCode: 200,
          Payload: Buffer.from('responseSerialized')
        })
      })
    };
    const requestMapper = {
      write: sinon.fake.returns('requestSerialized')
    };
    const responseMapper = {
      read: sinon.fake.returns('response')
    };
    const f = new Function.Client(
      client as any,
      'arn',
      requestMapper as any,
      responseMapper as any
    );
    const response = await f.invoke('request');
    expect(requestMapper.write.calledOnceWithExactly('request')).toBe(true);
    expect(client.invoke.calledOnceWithExactly({
      FunctionName: 'arn',
      InvocationType: 'RequestResponse',
      Payload: 'requestSerialized'
    })).toBe(true);
    expect(responseMapper.read.calledOnceWithExactly('responseSerialized')).toBe(true);
    expect(response).toEqual('response');
  });
  it('should throw Error if non-200 StatusCode', async () => {
    const client = {
      invoke: sinon.fake.returns({
        promise: () => Promise.resolve({
          StatusCode: 500,
          FunctionError: 'fail'
        })
      })
    };
    const requestMapper = {
      write: sinon.fake.returns('requestSerialized')
    };
    const responseMapper = {
      read: sinon.fake.returns('response')
    };
    const f = new Function.Client(
      client as any,
      'arn',
      requestMapper as any,
      responseMapper as any
    );
    expect.assertions(1);
    try {
      await f.invoke('request');
    } catch (err) {
      expect(err.message).toEqual("Function returned non-200 status code, '500' with error, 'fail'");
    }
  });
});
