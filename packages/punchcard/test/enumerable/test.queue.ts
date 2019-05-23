import 'jest';

import cdk = require('@aws-cdk/cdk');
import { Json, Queue, string } from '../../lib';

const stack = new cdk.Stack(new cdk.App(), 'stack');

const queue = new Queue(stack, 'Queue', {
  mapper: Json.forType(string())
});

describe('run', () => {
  it('should parse event into records', async () => {
    const records = await queue.run({Records: [{
      body: 'string'
    } as any]});

    expect(records).toEqual(['string']);
  });
});