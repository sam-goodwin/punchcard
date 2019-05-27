import AWS = require('aws-sdk');

import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import { Cache, PropertyBag } from '../property-bag';
import { Dependency, Runtime } from '../runtime';
import { Omit } from '../utils';

export class Bucket implements Dependency<Bucket.ReadWriteClient> {
  constructor(public readonly bucket: s3.IBucket) {}

  public install(target: Runtime): void {
    this.readWriteClient().install(target);
  }

  public deleteClient(): Dependency<Bucket.DeleteClient> {
    return this.client(this.bucket.grantDelete.bind(this.bucket));
  }
  public putClient(): Dependency<Bucket.PutClient> {
    return this.client(g => this.bucket.grantPut(g));
  }
  public readWriteClient(): Dependency<Bucket.ReadWriteClient> {
    return this.client(g => this.bucket.grantReadWrite(g));
  }
  public readClient(): Dependency<Bucket.ReadClient> {
    return this.client(g => this.bucket.grantRead(g));
  }
  public writeClient(): Dependency<Bucket.WriteClient> {
    return this.client(g => this.bucket.grantWrite(g));
  }

  private client(grant: (grantable: iam.IGrantable) => void): Dependency<Bucket.Client> {
    return {
      install: (target) => {
        grant(target.grantable);
        target.properties.set('bucketName', this.bucket.bucketName);
      },
      bootstrap: this.bootstrap.bind(this)
    };
  }

  public bootstrap(properties: PropertyBag, cache: Cache): Bucket.Client {
    return new Bucket.Client(cache.getOrCreate('aws:s3', () => new AWS.S3()), properties.get('bucketName'));
  }
}

export namespace Bucket {
  export type ReadWriteClient = Bucket.Client;
  export type DeleteClient = Pick<Bucket.Client, 'deleteObject' | 'bucketName' | 'client'>;
  export type PutClient = Pick<Bucket.Client, 'putObject' | 'bucketName' | 'client'>;
  export type ReadClient = Omit<Client, 'deleteObject' | 'putObject'>;
  export type WriteClient = Omit<Client, 'getObject' | 'headObject' | 'listObjectsV2' | 'listObjectsV2'>;

  export type DeleteObjectRequest = Omit<AWS.S3.DeleteObjectRequest, 'Bucket'>;
  export type GetObjectRequest = Omit<AWS.S3.GetObjectRequest, 'Bucket'>;
  export type HeadObjectRequest = Omit<AWS.S3.HeadObjectRequest, 'Bucket'>;
  export type ListObjectsRequest = Omit<AWS.S3.ListObjectsRequest, 'Bucket'>;
  export type ListObjectsV2Request = Omit<AWS.S3.ListObjectsV2Request, 'Bucket'>;
  export type PutObjectRequest = Omit<AWS.S3.PutObjectRequest, 'Bucket'>;

  export class Client {
    constructor(
      public readonly client: AWS.S3,
      public readonly bucketName: string
    ) {}

    public deleteObject(request: DeleteObjectRequest): Promise<AWS.S3.DeleteObjectOutput> {
      return this.client.deleteObject({
        ...request,
        Bucket: this.bucketName
      }).promise();
    }

    public getObject(request: GetObjectRequest): Promise<AWS.S3.GetObjectOutput> {
      return this.client.getObject({
        ...request,
        Bucket: this.bucketName
      }).promise();
    }

    public headObject(request: HeadObjectRequest): Promise<AWS.S3.HeadObjectOutput> {
      return this.client.headObject({
        ...request,
        Bucket: this.bucketName
      }).promise();
    }

    public listObjects(request: ListObjectsRequest): Promise<AWS.S3.ListObjectsOutput> {
      return this.client.listObjects({
        ...request,
        Bucket: this.bucketName
      }).promise();
    }

    public listObjectsV2(request: ListObjectsV2Request): Promise<AWS.S3.ListObjectsV2Output> {
      return this.client.listObjectsV2({
        ...request,
        Bucket: this.bucketName
      }).promise();
    }

    public putObject(request: PutObjectRequest): Promise<AWS.S3.PutObjectOutput> {
      return this.client.putObject({
        ...request,
        Bucket: this.bucketName
      }).promise();
    }
  }
}