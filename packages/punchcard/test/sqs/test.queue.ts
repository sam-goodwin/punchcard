import 'jest';
import sinon = require('sinon');

import core = require('@aws-cdk/core');
import { integer, string, StringShape } from '@punchcard/shape';
import { Core, SQS, Util } from '../../lib';
import { Build } from '../../lib/core/build';
import { Run } from '../../lib/core/run';

Util.setRuntime();

const payload = new SQS.Event.Payload({
  Records: [new SQS.Event.Message({
    attributes: {},
    awsRegion: 'awsRegion',
    body: JSON.stringify('string'),
    eventSource: 'eventSource',
    eventSourceARN: 'eventSourceARN',
    md5OfBody: 'md5OfBody',
    messageAttributes: {},
    messageId: 'messageId',
    receiptHandle: 'receiptHandle',
  })]
});

describe('run', () => {
  it('should parse event into records', async () => {
    const stack = Build.of(new core.Stack(new core.App( { autoSynth: false } ), 'stack'));

    const queue = new SQS.Queue<StringShape>(stack, 'Queue', {
      shape: string
    });

    const results: string[] = [];
    await (queue.messages().forEach(stack, 'id', {}, async (v) => {
      results.push(v);
      return Promise.resolve(v);
    }).handle(payload, [{}], {}));

    expect(results).toEqual(['string']);
  });
  it('should not require a depends property', async () => {
    const stack = Build.of(new core.Stack(new core.App( { autoSynth: false } ), 'stack'));

    const queue = new SQS.Queue<StringShape>(stack, 'Queue', {
      shape: string
    });

    const results: string[] = [];
    await (queue.messages().forEach(stack, 'od', {}, async (v) => {
      results.push(v);
      return Promise.resolve(v);
    }).handle(payload, [{}], {}));

    expect(results).toEqual(['string']);
  });
  it('should transform records with a map', async () => {
    const stack = Build.of(new core.Stack(new core.App( { autoSynth: false } ), 'stack'));

    const queue = new SQS.Queue<StringShape>(stack, 'Queue', {
      shape: string
    });

    const d1: Core.Dependency<string> = {
      bootstrap: Run.of(async () => 'd1'),
      install: Build.of(() => undefined)
    };
    const d2: Core.Dependency<string> = {
      bootstrap: Run.of(async () => 'd2'),
      install: Build.of(() => undefined)
    };

    const results: number[] = [];
    const f = await (Run.resolve(queue.messages().map({
      depends: d1,
    }, async (v, d1) => {
      expect(d1).toEqual('d1');
      return v.length;
    }).forEach(stack, 'od', {
      depends: d2,
    }, async (v, d2) => {
      expect(d2).toEqual('d2');
      results.push(v);
      return Promise.resolve(v);
    }).entrypoint));

    await f({
      Records: [{
      body: JSON.stringify('string')
    } as any]}, {});

    expect(results).toEqual(['string'.length]);
    expect.assertions(3);
  });
  it('should transform records with a map and `collect`', async () => {
    const stack = Build.of(new core.Stack(new core.App( { autoSynth: false } ), 'stack'));

    const queue = new SQS.Queue<StringShape>(stack, 'Queue', {
      shape: string
    });

    const d1: Core.Dependency<string> = {
      bootstrap: Run.of(async () => 'd1'),
      install: Build.of(() => undefined)
    };

    const stream = queue.messages()
      .map({
        depends: d1,
      }, async (v, d1) => {
        expect(d1).toEqual('d1');
        return v.length;
      })
      .collect(stack, 'Stream', Util.Collectors.toKinesisStream({
        shape: integer
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
    const stack = Build.of(new core.Stack(new core.App( { autoSynth: false } ), 'stack'));

    const queue = new SQS.Queue<StringShape>(stack, 'Queue', {
      shape: string
    });

    const d1: Core.Dependency<string> = {
      bootstrap: Run.of(async () => 'd1'),
      install: Build.of(() => undefined)
    };

    const stream = queue.messages()
      .map({
        depends: d1,
      }, async (v, d1) => {
        expect(d1).toEqual('d1');
        return v.length;
      })
      .toKinesisStream(stack, 'Stream', {
        shape: integer
      });

    const sink = {
      sink: sinon.fake()
    };

    await (stream as any).sender.handle(payload, [sink as any, 'd1'], {});

    expect(sink.sink.calledOnceWith(['string'.length])).toBe(true);
    expect.assertions(2);
  });
});