import iam = require('@aws-cdk/aws-iam');
import kinesis = require('@aws-cdk/aws-kinesis');
import core = require('@aws-cdk/core');
import AWS = require('aws-sdk');
import uuid = require('uuid');

import { Namespace } from '../core/assembly';
import { Build } from '../core/build';
import { Cache } from '../core/cache';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { Run } from '../core/run';
import { DeliveryStream } from '../firehose/delivery-stream';
import { BufferMapper, Json, Mapper, RuntimeShape, Shape } from '../shape';
import { Codec } from '../util/codec';
import { Compression } from '../util/compression';
import { Client } from './client';
import { Event } from './event';
import { Records } from './records';

export interface StreamProps<S extends Shape<any>> extends kinesis.StreamProps {
  /**
   * Type of data in the stream.
   */
  shape: S;

  /**
   * @default - uuid
   */
  partitionBy?: (record: RuntimeShape<S>) => string;
}

/**
 * A Kinesis stream.
 */
export class Stream<S extends Shape<any>> implements Resource<kinesis.Stream> {
  public readonly shape: S;
  public readonly mapper: Mapper<RuntimeShape<S>, Buffer>;
  public readonly partitionBy: (record: RuntimeShape<S>) => string;
  public readonly resource: Build<kinesis.Stream>;

  constructor(scope: Build<core.Construct>, id: string, props: StreamProps<S>) {
    this.shape = props.shape;
    this.resource = scope.map(scope => new kinesis.Stream(scope, id, props));
    this.mapper = BufferMapper.wrap(Json.forShape(props.shape));
    this.partitionBy = props.partitionBy || (_ => uuid());
  }

  /**
   * Create an stream for this stream to perform chainable computations (map, flatMap, filter, etc.)
   */
  public records(): Records<RuntimeShape<S>, []> {
    const mapper = this.mapper;
    class Root extends Records<RuntimeShape<S>, []> {
      /**
       * Return an iterator of records parsed from the raw data in the event.
       * @param event kinesis event sent to lambda
       */
      public async *run(event: Event) {
        for (const record of event.Records.map(record => mapper.read(Buffer.from(record.kinesis.data, 'base64')))) {
          yield record;
        }
      }
    }
    return new Root(this, undefined as any, {
      depends: [],
      handle: i => i
    });
  }

  /**
   * Forward data in this stream to S3 via a Firehose Delivery Stream.
   *
   * Stream -> Firehose -> S3 (minutely).
   */
  public toFirehoseDeliveryStream(scope: Build<core.Construct>, id: string, props: {
    codec: Codec;
    compression: Compression;
  } = {
    codec: Codec.Json,
    compression: Compression.Gzip
  }): DeliveryStream<S> {
    return new DeliveryStream(scope, id, {
      stream: this,
      codec: props.codec,
      compression: props.compression,
    });
  }

  /**
   * Read and Write access to this stream.
   */
  public readWriteAccess(): Dependency<Client<S>> {
    return this.dependency((stream, g) => stream.grantReadWrite(g));
  }

  /**
   * Read-only access to this stream.
   */
  public readAccess(): Dependency<Client<S>> {
    return this.dependency((stream, g) => stream.grantRead(g));
  }

  /**
   * Write-only access to this stream.
   */
  public writeAccess(): Dependency<Client<S>> {
    return this.dependency((stream, g) => stream.grantWrite(g));
  }

  private dependency(grant: (stream: kinesis.Stream, grantable: iam.IGrantable) => void): Dependency<Client<S>> {
    return {
      install: this.resource.map(stream => (ns, grantable) => {
        grant(stream, grantable);
        ns.set('streamName', stream.streamName);
      }),
      bootstrap: Run.of(async (ns, cache) =>
        new Client(
          this,
          ns.get('streamName'),
          cache.getOrCreate('aws:kinesis', () => new AWS.Kinesis())) as any)
    };
  }
}
