import iam = require('@aws-cdk/aws-iam');
import kinesis = require('@aws-cdk/aws-kinesis');
import core = require('@aws-cdk/core');
import AWS = require('aws-sdk');
import uuid = require('uuid');

import { Shape } from '@punchcard/shape';
import { Mapper, Runtime } from '@punchcard/shape-runtime';
import { Build } from '../core/build';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { Run } from '../core/run';
import { DeliveryStream } from '../firehose/delivery-stream';
import { Codec } from '../util/codec';
import { Compression } from '../util/compression';
import { jsonBufferMapper } from '../util/json-mapper';
import { Client } from './client';
import { Event } from './event';
import { Records } from './records';

export interface StreamProps<T extends Shape> extends kinesis.StreamProps {
  /**
   * Type of data in the stream.
   */
  shape: T;

  /**
   * Override the Mapper to provide different formats.
   *
   * Defaults to JSON.
   */
  mapper?: Mapper<T, Buffer>;

  /**
   * @default - uuid
   */
  partitionBy?: (record: Runtime.Of<T>) => string;
}

/**
 * A Kinesis stream.
 */
export class Stream<T extends Shape> implements Resource<kinesis.Stream> {
  public readonly shape: T;
  public readonly mapper: Mapper<Runtime.Of<T>, Buffer>;
  public readonly partitionBy: (record: Runtime.Of<T>) => string;
  public readonly resource: Build<kinesis.Stream>;

  constructor(scope: Build<core.Construct>, id: string, props: StreamProps<T>) {
    this.shape = props.shape;
    this.resource = scope.map(scope => new kinesis.Stream(scope, id, props));
    this.mapper = props.mapper || jsonBufferMapper(props.shape);
    this.partitionBy = props.partitionBy || (_ => uuid());
  }

  /**
   * Create an stream for this stream to perform chainable computations (map, flatMap, filter, etc.)
   */
  public records(): Records<Runtime.Of<T>, []> {
    const mapper = this.mapper;
    class Root extends Records<Runtime.Of<T>, []> {
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
  }): DeliveryStream<T> {
    return new DeliveryStream(scope, id, {
      stream: this,
      codec: props.codec,
      compression: props.compression,
    });
  }

  /**
   * Read and Write access to this stream.
   */
  public readWriteAccess(): Dependency<Stream.ReadWrite<T>> {
    return this.dependency((stream, g) => stream.grantReadWrite(g));
  }

  /**
   * Read-only access to this stream.
   */
  public readAccess(): Dependency<Stream.ReadOnly<T>> {
    return this.dependency((stream, g) => stream.grantRead(g));
  }

  /**
   * Write-only access to this stream.
   */
  public writeAccess(): Dependency<Stream.WriteOnly<T>> {
    return this.dependency((stream, g) => stream.grantWrite(g));
  }

  private dependency(grant: (stream: kinesis.Stream, grantable: iam.IGrantable) => void): Dependency<Client<T>> {
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

export namespace Stream {
  export interface ReadOnly<S extends Shape> extends Omit<Client<S>, 'putRecord' | 'putRecords' | 'sink'> {}
  export interface WriteOnly<S extends Shape> extends Omit<Client<S>, 'getRecords'> {}
  export interface ReadWrite<S extends Shape> extends Client<S> {}
}
