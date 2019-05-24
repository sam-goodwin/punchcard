import 'jest';

import cdk = require('@aws-cdk/cdk');
import { Json, Queue, string } from '../../lib';
import { setRuntime } from '../../lib/constants';

setRuntime();

describe('run', () => {
  it('should parse event into records', async () => {
    const stack = new cdk.Stack(new cdk.App(), 'stack');

    const queue = new Queue(stack, 'Queue', {
      mapper: Json.forType(string())
    });

    const results: string[] = [];
    await (queue.forEach(stack, 'od', v => {
      results.push(v);
      return Promise.resolve(v);
    }) as any).handle({
      Records: [{
      body: JSON.stringify('string')
    } as any]});

    expect(results).toEqual(['string']);
  });
  it('should transform records with a map', async () => {
    const stack = new cdk.Stack(new cdk.App(), 'stack');

    const queue = new Queue(stack, 'Queue', {
      mapper: Json.forType(string())
    });

    const results: number[] = [];
    await (queue.map(async v => v.length).forEach(stack, 'od', v => {
      results.push(v);
      return Promise.resolve(v);
    }) as any).handle({
      Records: [{
      body: JSON.stringify('string')
    } as any]});

    expect(results).toEqual(['string'.length]);
  });
});