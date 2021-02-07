import AWS = require('aws-sdk');

import { Build } from '../core/build';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { Run } from '../core/run';
import { Client, DeleteClient, PutClient, ReadClient, ReadWriteClient, WriteClient } from './client';
import { Notifications } from './notifications';

import type * as iam from '@aws-cdk/aws-iam';
import type * as s3 from '@aws-cdk/aws-s3';

export class Bucket implements Resource<s3.Bucket> {
  constructor(public readonly resource: Build<s3.Bucket>) {}

  public notifications(): Notifications<any, []> {
    return new Notifications(this, null as any, {
      depends: [],
      handle: value => value
    });
  }

  public deleteAccess(): Dependency<DeleteClient> {
    return this.dependency((b, g) => b.grantDelete(g));
  }
  public putAccess(): Dependency<PutClient> {
    return this.dependency((b, g) => b.grantPut(g));
  }
  public readWriteAccess(): Dependency<ReadWriteClient> {
    return this.dependency((b, g) => b.grantReadWrite(g));
  }
  public readAccess(): Dependency<ReadClient> {
    return this.dependency((b, g) => b.grantRead(g));
  }
  public writeAccess(): Dependency<WriteClient> {
    return this.dependency((b, g) => b.grantWrite(g));
  }

  private dependency(grant: (bucket: s3.Bucket, grantable: iam.IGrantable) => void): Dependency<Client> {
    return {
      install: this.resource.map(bucket => (namespace, grantable) => {
        grant(bucket, grantable);
        namespace.set('bucketName', bucket.bucketName);
      }),
      bootstrap: Run.of(async (ns, cache) => new Client(cache.getOrCreate('aws:s3', () => new AWS.S3()), ns.get('bucketName')))
    };
  }
}
