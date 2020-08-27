import core = require('@aws-cdk/core');
import 'jest';
import sinon = require('sinon');

import { Core, Lambda, Util } from '../../lib';
import { Build } from '../../lib/core/build';
import { Run } from '../../lib/core/run';

// stop web-pack from running
// TODO: gross as fuck - every user will have to do this
Util.setRuntime();

describe('Function', () => {
  it('should install clients in context', () => {
    const stack = Build.of(new core.Stack(new core.App({ autoSynth: false }), 'stack'));
    const client: Core.Dependency<any> = {
      install: Build.of((namespace, grantable) => namespace.set('test', 'value')),
      bootstrap: Run.of(async () => null)
    };
    const f = Lambda.L().spawn(stack, 'function', {depends: client, }, null as any);
    const fn = Build.resolve(f.resource);
    expect((fn as any).environment[`punchcard_test`]).toEqual({value: 'value'});
  });
  it('should bootstrap all clients on boot and pass to handler', async () => {
    const stack = Build.of(new core.Stack(new core.App({ autoSynth: false }), 'stack'));
    const client: Core.Dependency<any> = {
      install: Build.of((namespace, grantable) => namespace.set('test', 'value')),
      bootstrap: Run.of(async () => 'client')
    };
    const fake = sinon.fake();
    const f = new Lambda.Function(stack, 'function', {
      depends: client,
    }, fake);
    const handler = await Run.resolve(f.entrypoint);
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
    const f = new Lambda.Function.Client(
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
    const f = new Lambda.Function.Client(
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
    const f = new Lambda.Function.Client(
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
    bootstrap: Run.of(sinon.fake.returns(Promise.resolve(1))),
    install: Build.of(sinon.fake())
  };

  const f = Lambda.L().spawn(Build.of(new core.Stack(new core.App( { autoSynth: false }), 'stack')), 'f', {
    depends: dependency,
  }, async (_, dep: any) => {
    return dep.toString(); // expect '1' as result
  });
  Build.resolve(f.resource);

  expect(await (await Run.resolve(f.entrypoint))('event', {})).toEqual('1');
  expect(Build.resolve(dependency.install).calledOnce).toBe(true);
});

it('should install and bootstrap nested dependencies', async () => {
  const dependency: Core.Dependency<any> = {
    bootstrap: Run.of(sinon.fake.returns(Promise.resolve(1))),
    install: Build.of(sinon.fake())
  };

  const f = Lambda.L().spawn(Build.of(new core.Stack(new core.App( { autoSynth: false } ), 'stack')), 'f', {
    depends: Core.Dependency.concat(dependency, dependency),
  }, async (_, [d1, d2]) => {
    return (d1 as any).toString() + (d2 as any).toString(); // expect '11' as result
  });
  Build.resolve(f.resource);

  expect(await (await Run.resolve(f.entrypoint))('event', {})).toEqual('11');
  expect((Build.resolve(dependency.install) as sinon.SinonSpy).calledTwice).toBe(true);
});
