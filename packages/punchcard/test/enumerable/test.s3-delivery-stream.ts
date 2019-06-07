import 'jest';
import sinon = require('sinon');

import cdk = require('@aws-cdk/cdk');
import { Codec, S3DeliveryStream, string } from '../../lib';
import { setRuntime } from '../../lib/constants';
import { Compression } from '../../lib/storage/glue/compression';

setRuntime();

describe('run', () => {
  it('should parse event into records', async () => {
    const stack = new cdk.Stack(new cdk.App(), 'stack');

    const bucket = {
      getObject: sinon.fake.returns(Promise.resolve({

      }))
    };

    const stream = new S3DeliveryStream(stack, 'Queue', {
      codec: Codec.Json,
      compression: Compression.None,
      type: string()
    });

    const results: string[] = [];
    await (stream.enumerable().forEach(stack, 'id', {
      async handle(v) {
        results.push(v);
        return Promise.resolve(v);
      }
    }).handle({
      Records: [{
      body: JSON.stringify('string')
    } as any]}, [bucket as any], {}));

    expect(results).toEqual(['string']);
  });
});