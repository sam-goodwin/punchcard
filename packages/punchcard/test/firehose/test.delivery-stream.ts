import 'jest';

import core = require('@aws-cdk/core');
import sinon = require('sinon');

import { Firehose, Util } from '../../lib';
import { Build } from '../../lib/core/build';

import { Record, Shape, string } from '@punchcard/shape';
import { DataType } from '@punchcard/shape-glue';

Util.setRuntime();

class Data extends Record({
  key: string
}) {}

describe('run', () => {
  it('should get object amnd parse lines into records', async () => {
    const stack = Build.of(new core.Stack(new core.App({ autoSynth: false }), 'stack'));

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
      compression: Util.Compression.None,
      shape: Shape.of(Data)
      // shape: Shape.struct({key: Shape.string()})
    });

    const results: Array<{key: string}> = [];
    await (stream.objects().forEach(stack, 'id', {}, async (v) => {
      results.push(v);
      return Promise.resolve(v);
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
    const stack = Build.of(new core.Stack(new core.App({ autoSynth: false }), 'stack'));

    const bucket = {
      getObject: sinon.fake.returns(Promise.reject(new Error('fail')))
    };

    const stream = new Firehose.DeliveryStream(stack, 'Queue', {
      compression: Util.Compression.None,
      shape: Shape.of(Data)
    });

    expect((stream.objects().forEach(stack, 'id', {}, async (v) => {
      // do nothing
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