import 'jest';

import core = require('@aws-cdk/core');
import sinon = require('sinon');

import { Firehose, Util } from '../../lib';
import { Build } from '../../lib/core/build';

import { Record, Shape, string } from '@punchcard/shape';
import { Event } from '../../lib/s3';

Util.setRuntime();

class Data extends Record({
  key: string
}) {}

const payload = new Event.Payload({
  Records: [new Event.Notification({
    awsRegion: 'us-east-1',
    eventName: 'eventName',
    eventSource: 'eventSource',
    eventTime: 'eventTime',
    eventVersion: 'eventVersion',
    requestParameters: new Event.RequestParameters({
      sourceIPAddress: '0.0.0.0'
    }),
    responseElements: new Event.ResponseElements({
      "x-amz-id-2": 'id-2',
      "x-amz-request-id": 'request-id'
    }),
    s3: new Event.S3({
      bucket: new Event.Bucket({
        arn: 'arn',
        name: 'name',
        ownerIdentity: new Event.OwnerIdentity({
          principalId: 'principalId'
        })
      }),
      object: new Event.Object({
        key: 'key',
        eTag: 'eTag',
        sequencer: 'sequencer',
        size: 0
      }),
      configurationId: 'configurationId',
      s3SchemaVersion: 's3SchemaVersion'
    }),
  })]
});

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
    });

    const results: Array<{key: string}> = [];
    await (stream.objects().forEach(stack, 'id', {}, async (v) => {
      results.push(v);
      return Promise.resolve(v);
    }).handle(payload, [bucket as any], {}));

    expect(results).toEqual([new Data({
      key: 'string1'
    }), new Data({
      key: 'string2'
    })]);
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
    }).handle(payload, [bucket as any], {}))).rejects.toEqual(new Error('fail'));
  });
});