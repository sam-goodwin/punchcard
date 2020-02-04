import iam = require('@aws-cdk/aws-iam');
import kinesis = require('@aws-cdk/aws-kinesis');
import core = require('@aws-cdk/core');
import json = require('@punchcard/shape-json');
import AWS = require('aws-sdk');
import uuid = require('uuid');

import { any, AnyShape, Mapper, MapperFactory, ShapeOrRecord, Value } from '@punchcard/shape';
import { DataType } from '@punchcard/shape-hive';
import { Build } from '../core/build';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { Run } from '../core/run';
import { DeliveryStream } from '../firehose/delivery-stream';
import { Compression } from '../util/compression';
import { Client } from './client';
import { Event } from './event';
import { Records } from './records';

export interface StreamProps<T extends ShapeOrRecord = AnyShape> {
  /**
   * Shape of data in the Stream.
   *
   * @default AnyShape
   */
  shape?: T;
  /**
   * Override serialziation mapper implementation. Messages are stringified
   * with a mapper when received/sent to/from the Kinesis Stream.
   *
   * @default Json
   */
  mapper?: MapperFactory<Buffer>;

  /**
   * How to partition a record in the Stream.
   *
   * @default - uuid
   */
  partitionBy?: (record: Value.Of<T>) => string;

  /**
   * Override the Kinesis StreamProps at Build time.
   *
   * @default - default CDK behavior
   */
  streamProps?: Build<kinesis.StreamProps>;
}

/**
 * A Kinesis stream.
 */
export class Stream<T extends ShapeOrRecord = AnyShape> implements Resource<kinesis.Stream> {
  public readonly mapper: Mapper<Value.Of<T>, Buffer>;
  public readonly mapperFactory: MapperFactory<Buffer>;
  public readonly partitionBy: (record: Value.Of<T>) => string;
  public readonly resource: Build<kinesis.Stream>;
  public readonly shape: T;

  constructor(scope: Build<core.Construct>, id: string, props: StreamProps<T>) {
    this.resource = scope.chain(scope =>
      (props.streamProps || Build.of({})).map(props =>
        new kinesis.Stream(scope, id, props)));

    this.shape = (props.shape || any) as T;
    this.partitionBy = props.partitionBy || (_ => uuid());
    this.mapperFactory = (props.mapper || json.bufferMapper);
    this.mapper = this.mapperFactory(this.shape);
  }

  /**
   * Create an stream for this stream to perform chainable computations (map, flatMap, filter, etc.)
   */
  public records(): Records<Value.Of<T>, []> {
    const mapper = this.mapper;
    class Root extends Records<Value.Of<T>, []> {
      /**
       * Return an iterator of records parsed from the raw data in the event.
       * @param event kinesis event sent to lambda
       */
      public async *run(event: Event.Payload) {
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
    dataType?: DataType;
    compression: Compression;
  } = {
    compression: Compression.Gzip
  }): DeliveryStream<T> {
    return new DeliveryStream(scope, id, {
      stream: this,
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
  export interface ReadOnly<S extends ShapeOrRecord> extends Omit<Client<S>, 'putRecord' | 'putRecords' | 'sink'> {}
  export interface WriteOnly<S extends ShapeOrRecord> extends Omit<Client<S>, 'getRecords'> {}
  export interface ReadWrite<S extends ShapeOrRecord> extends Client<S> {}
}
