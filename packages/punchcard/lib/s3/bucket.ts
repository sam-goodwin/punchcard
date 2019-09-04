import AWS = require('aws-sdk');

import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');

import { Namespace } from '../core/assembly';
import { Cache } from '../core/cache';
import { Dependency } from '../core/dependency';
import { Client, DeleteClient, PutClient, ReadClient, ReadWriteClient, WriteClient } from './client';
import { Notifications } from './notifications';

export class Bucket implements Dependency<ReadWriteClient> {
  constructor(public readonly bucket: s3.Bucket) {}

  public install(namespace: Namespace, grantable: iam.IGrantable): void {
    this.readWriteAccess().install(namespace, grantable);
  }

  public notifications(): Notifications<any, []> {
    return new Notifications(this, null as any, {
      depends: [],
      handle: value => value
    });
  }

  public deleteAccess(): Dependency<DeleteClient> {
    return this.client(this.bucket.grantDelete.bind(this.bucket));
  }
  public putAccess(): Dependency<PutClient> {
    return this.client(g => this.bucket.grantPut(g));
  }
  public readWriteAccess(): Dependency<ReadWriteClient> {
    return this.client(g => this.bucket.grantReadWrite(g));
  }
  public readAccess(): Dependency<ReadClient> {
    return this.client(g => this.bucket.grantRead(g));
  }
  public writeAccess(): Dependency<WriteClient> {
    return this.client(g => this.bucket.grantWrite(g));
  }

  private client(grant: (grantable: iam.IGrantable) => void): Dependency<Client> {
    return {
      install: (namespace, grantable) => {
        grant(grantable);
        namespace.set('bucketName', this.bucket.bucketName);
      },
      bootstrap: this.bootstrap.bind(this)
    };
  }

  public async bootstrap(namespace: Namespace, cache: Cache): Promise<Client> {
    return new Client(cache.getOrCreate('aws:s3', () => new AWS.S3()), namespace.get('bucketName'));
  }
}
