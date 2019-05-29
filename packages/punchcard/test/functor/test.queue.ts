import 'jest';

import cdk = require('@aws-cdk/cdk');
import { Dependency, Function, integer, Queue, string } from '../../lib';
import { setRuntime } from '../../lib/constants';

setRuntime();

describe('run', () => {
  it('should parse event into records', async () => {
    const stack = new cdk.Stack(new cdk.App(), 'stack');

    const queue = new Queue(stack, 'Queue', {
      type: string()
    });

    const results: string[] = [];
    await (queue.stream().forEach(stack, 'od', {
      depends: Dependency.none,
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
    const stack = new cdk.Stack(new cdk.App(), 'stack');

    const queue = new Queue(stack, 'Queue', {
      type: string()
    });

    const results: number[] = [];
    await (queue.stream().map({
      depends: Dependency.none,
      handle: async (v) => v.length
    }).forEach(stack, 'od', {
      depends: Dependency.none,
        handle: async v => {
        results.push(v);
        return Promise.resolve(v);
      }
    }) as any).handle({
      Records: [{
      body: JSON.stringify('string')
    } as any]}, [Dependency.none, Dependency.none]);

    expect(results).toEqual(['string'.length]);
  });
  // it('should send to Kinesis Stream', async () => {
  //   const stack = new cdk.Stack(new cdk.App(), 'stack');

  //   const queue = new Queue(stack, 'Queue', {
  //     type: string()
  //   });

  //   queue.stream().map({
  //     depends: Dependency.none,
  //     handle: async (v) => v.length
  //   }).toStream(stack, 'ToStream', {
  //     partitionBy: n => n.toString(),
  //     type: integer(),
  //   });

  //   await f.handle({
  //     Records: [{
  //     body: JSON.stringify('string')
  //   } as any]}, [])
  // })
});