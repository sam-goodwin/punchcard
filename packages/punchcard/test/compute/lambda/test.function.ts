import core = require('@aws-cdk/core');
import 'jest';
import sinon = require('sinon');

import { Dependency, Function, L } from '../../../lib';
import { setRuntime } from '../../../lib/constants';

// stop web-pack from running
// TODO: gross as fuck - every user will have to do this
setRuntime();

describe('Function', () => {
  it('should install clients in context', () => {
    const stack = new core.Stack(new core.App(), 'stack');
    const client: Dependency<any> = {
      install: (namespace, grantable) => namespace.set('test', 'value'),
      bootstrap: async () => null
    };
    const f = L().spawn(stack, 'function', {
      depends: client,
      handle: null as any
    });
    expect((f as any).environment[`${f.node.uniqueId}_test`]).toEqual('value');
  });
  it('should bootstrap all clients on boot and pass to handler', async () => {
    const stack = new core.Stack(new core.App(), 'stack');
    const client: Dependency<any> = {
      install: (namespace, grantable) => namespace.set('test', 'value'),
      bootstrap: async () => 'client'
    };
    const fake = sinon.fake();
    const f = new Function(stack, 'function', {
      depends: client,
      handle: fake
    });
    const handler = await f.boot();
    await handler(null, null);
    expect(fake.args[0][1]).toEqual('client');
    expect(fake.calledOnceWithExactly(null, 'client', null)).toBe(true);
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

it('should install and bootstrap dependencies', async () => {
  const dependency = {
    bootstrap: sinon.fake.returns(Promise.resolve(1)),
    install: sinon.fake()
  };

  const f = L().spawn(new core.Stack(new core.App(), 'stack'), 'f', {
    depends: dependency,
    async handle(_, dep: any) {
      return dep.toString(); // expect '1' as result
    }
  });

  expect(await (await f.boot())('event', {})).toEqual('1');
  expect(dependency.install.calledOnce).toBe(true);
});

it('should install and bootstrap nested dependencies', async () => {
  const dependency = {
    bootstrap: sinon.fake.returns(Promise.resolve(1)),
    install: sinon.fake()
  };

  const f = L().spawn(new core.Stack(new core.App(), 'stack'), 'f', {
    depends: Dependency.list(dependency, dependency),
    async handle(_, [d1, d2]) {
      return (d1 as any).toString() + (d2 as any).toString(); // expect '11' as result
    }
  });

  expect(await (await f.boot())('event', {})).toEqual('11');
  expect(dependency.install.calledTwice).toBe(true);
});

// it('should install and bootstrap named dependencies', async () => {
//   const dependency = {
//     bootstrap: sinon.fake.returns(Promise.resolve(1)),
//     install: sinon.fake()
//   };

//   const f = L().spawn(new cdk.Stack(new cdk.App(), 'stack'), 'f', {
//     depends: Dependency.list({
//       d1: dependency,
//       d2: dependency
//     }),
//     async handle(_, {d1, d2}) {
//       return d1.toString() + d2.toString(); // expect '11' as result
//     }
//   });

//   expect(await (await f.boot())('event', {})).toEqual('11');
//   expect(dependency.install.calledTwice).toBe(true);
// });
