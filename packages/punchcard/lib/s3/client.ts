export type ReadWriteClient = Client;
export type DeleteClient = Pick<Client, 'deleteObject' | 'bucketName' | 'client'>;
export type PutClient = Pick<Client, 'putObject' | 'bucketName' | 'client'>;
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