import iam = require('@aws-cdk/aws-iam');
import kinesis = require('@aws-cdk/aws-kinesis');
import core = require('@aws-cdk/core');
import AWS = require('aws-sdk');
import uuid = require('uuid');

import { Namespace } from '../core/assembly';
import { Cache } from '../core/cache';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { DeliveryStream } from '../firehose/delivery-stream';
import { BufferMapper, Json, Mapper, RuntimeType, Type } from '../shape';
import { Codec } from '../util/codec';
import { Compression } from '../util/compression';
import { Client } from './client';
import { Event } from './event';
import { Records } from './records';

export interface StreamProps<T extends Type<any>> extends kinesis.StreamProps {
  /**
   * Type of data in the stream.
   */
  type: T;

  /**
   * @default - uuid
   */
  partitionBy?: (record: RuntimeType<T>) => string;
}

/**
 * A Kinesis stream.
 */
export class Stream<T extends Type<any>> implements Resource<kinesis.Stream>, Dependency<Client<T>> {
  public readonly type: T;
  public readonly mapper: Mapper<RuntimeType<T>, Buffer>;
  public readonly partitionBy: (record: RuntimeType<T>) => string;
  public readonly resource: kinesis.Stream;

  constructor(scope: core.Construct, id: string, props: StreamProps<T>) {
    this.type = props.type;
    this.resource = new kinesis.Stream(scope, id, props);
    this.mapper = BufferMapper.wrap(Json.forType(props.type));
    this.partitionBy = props.partitionBy || (_ => uuid());
  }

  /**
   * Create an stream for this stream to perform chainable computations (map, flatMap, filter, etc.)
   */
  public records(): Records<RuntimeType<T>, []> {
    const mapper = this.mapper;
    class Root extends Records<RuntimeType<T>, []> {
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
  public toFirehoseDeliveryStream(scope: core.Construct, id: string, props: {
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
   * Create a client for this `Stream` from within a `Runtime` environment (e.g. a Lambda Function.).
   * @param namespace runtime properties local to this `stream`.
   * @param cache global `Cache` shared by all clients.
   */
  public async bootstrap(namespace: Namespace, cache: Cache): Promise<Client<T>> {
    return new Client(this,
      namespace.get('streamName'),
      cache.getOrCreate('aws:kinesis', () => new AWS.Kinesis()));
  }

  /**
   * Set `streamName` and grant permissions to a `Runtime` so it may `bootstrap` a client for this `Stream`.
   */
  public install(namespace: Namespace, grantable: iam.IGrantable): void {
    this.readWriteAccess().install(namespace, grantable);
  }

  /**
   * Read and Write access to this stream.
   */
  public readWriteAccess(): Dependency<Client<T>> {
    return this._client(g => this.resource.grantReadWrite(g));
  }

  /**
   * Read-only access to this stream.
   */
  public readAccess(): Dependency<Client<T>> {
    return this._client(g => this.resource.grantRead(g));
  }

  /**
   * Write-only access to this stream.
   */
  public writeAccess(): Dependency<Client<T>> {
    return this._client(g => this.resource.grantWrite(g));
  }

  private _client(grant: (grantable: iam.IGrantable) => void): Dependency<Client<T>> {
    return {
      install: (namespace, grantable) => {
        namespace.set('streamName', this.resource.streamName);
        grant(grantable);
      },
      bootstrap: this.bootstrap.bind(this),
    };
  }
}
