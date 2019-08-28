import 'jest';
import sinon = require('sinon');

import core = require('@aws-cdk/core');
import { Core, Shape, SQS, Util } from '../../lib';

Util.setRuntime();

describe('run', () => {
  it('should parse event into records', async () => {
    const stack = new core.Stack(new core.App(), 'stack');

    const queue = new SQS.Queue(stack, 'Queue', {
      type: Shape.string()
    });

    const results: string[] = [];
    await (queue.messages().forEach(stack, 'od', {
      async handle(v) {
        results.push(v);
        return Promise.resolve(v);
      }
    }).handle({
      Records: [{
      body: JSON.stringify('string')
    } as any]}, [{}], {}));

    expect(results).toEqual(['string']);
  });
  it('should not require a depends property', async () => {
    const stack = new core.Stack(new core.App(), 'stack');

    const queue = new SQS.Queue(stack, 'Queue', {
      type: Shape.string()
    });

    const results: string[] = [];
    await (queue.messages().forEach(stack, 'od', {
      async handle(v) {
        results.push(v);
        return Promise.resolve(v);
      }
    }).handle({
      Records: [{
      body: JSON.stringify('string')
    } as any]}, [{}], {}));

    expect(results).toEqual(['string']);
  });
  it('should transform records with a map', async () => {
    const stack = new core.Stack(new core.App(), 'stack');

    const queue = new SQS.Queue(stack, 'Queue', {
      type: Shape.string()
    });

    const d1: Core.Dependency<string> = {
      bootstrap: async () => 'd1',
      install: () => undefined
    };
    const d2: Core.Dependency<string> = {
      bootstrap: async () => 'd2',
      install: () => undefined
    };

    const results: number[] = [];
    const f = await (queue.messages().map({
      depends: d1,
      handle: async (v, d1) => {
        expect(d1).toEqual('d1');
        return v.length;
      }
    }).forEach(stack, 'od', {
      depends: d2,
      handle: async (v, d2) => {
        expect(d2).toEqual('d2');
        results.push(v);
        return Promise.resolve(v);
      }
    }).boot());

    await f({
      Records: [{
      body: JSON.stringify('string')
    } as any]}, {});

    expect(results).toEqual(['string'.length]);
    expect.assertions(3);
  });
  it('should transform records with a map and `collect`', async () => {
    const stack = new core.Stack(new core.App(), 'stack');

    const queue = new SQS.Queue(stack, 'Queue', {
      type: Shape.string()
    });

    const d1: Core.Dependency<string> = {
      bootstrap: async () => 'd1',
      install: () => undefined
    };

    const stream = queue.messages()
      .map({
        depends: d1,
        handle: async (v, d1) => {
          expect(d1).toEqual('d1');
          return v.length;
        }
      })
      .collect(stack, 'Stream', Util.Collectors.toKinesisStream({
        type: Shape.integer()
      }));

    const sink = {
      sink: sinon.fake()
    };

    await stream.sender.handle({
      Records: [{
      body: JSON.stringify('string')
    } as any]}, [sink as any, 'd1'], {});

    expect(sink.sink.calledOnceWith(['string'.length])).toBe(true);
    expect.assertions(2);
  });
  it('should transform records with a map and toStream', async () => {
    const stack = new core.Stack(new core.App(), 'stack');

    const queue = new SQS.Queue(stack, 'Queue', {
      type: Shape.string()
    });

    const d1: Core.Dependency<string> = {
      bootstrap: async () => 'd1',
      install: () => undefined
    };

    const stream = queue.messages()
      .map({
        depends: d1,
        handle: async (v, d1) => {
          expect(d1).toEqual('d1');
          return v.length;
        }
      })
      .toKinesisStream(stack, 'Stream', {
        type: Shape.integer()
      });

    const sink = {
      sink: sinon.fake()
    };

    await stream.sender.handle({
      Records: [{
      body: JSON.stringify('string')
    } as any]}, [sink as any, 'd1'], {});

    expect(sink.sink.calledOnceWith(['string'.length])).toBe(true);
    expect.assertions(2);
  });
});