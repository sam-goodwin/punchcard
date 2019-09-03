import 'jest';
import sinon = require('sinon');

import core = require('@aws-cdk/core');
import { Firehose, Shape, Util } from '../../lib';

Util.setRuntime();

describe('run', () => {
  it('should get object amnd parse lines into records', async () => {
    const stack = new core.Stack(new core.App(), 'stack');

    const bucket = {
      getObject: sinon.fake.returns(Promise.resolve({
        Body: `${JSON.stringify({
          key: 'string1'
        })}\n${JSON.stringify({
          key: 'string2'
        })}\n`
      }))
    };

    const stream = new Firehose.DeliveryStream(stack, 'Queue', {
      codec: Util.Codec.Json,
      compression: Util.Compression.None,
      shape: Shape.struct({key: Shape.string()})
    });

    const results: Array<{key: string}> = [];
    await (stream.objects().forEach(stack, 'id', {
      async handle(v) {
        results.push(v);
        return Promise.resolve(v);
      }
    }).handle({
      Records: [{
        s3: {
          object: {
            key: 'key',
            eTag: 'eTag'
          }
        }
      } as any]
    }, [bucket as any], {}));

    expect(results).toEqual([{
      key: 'string1'
    }, {
      key: 'string2'
    }]);
  });

  it('should throw if getting object fails', async () => {
    const stack = new core.Stack(new core.App(), 'stack');

    const bucket = {
      getObject: sinon.fake.returns(Promise.reject(new Error('fail')))
    };

    const stream = new Firehose.DeliveryStream(stack, 'Queue', {
      codec: Util.Codec.Json,
      compression: Util.Compression.None,
      shape: Shape.struct({key: Shape.string()})
    });

    expect((stream.objects().forEach(stack, 'id', {
      async handle(v) {
        // do nothing
      }
    }).handle({
      Records: [{
        s3: {
          object: {
            key: 'key',
            eTag: 'eTag'
          }
        }
      } as any]
    }, [bucket as any], {}))).rejects.toEqual(new Error('fail'));
  });
});