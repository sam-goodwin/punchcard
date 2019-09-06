import AWS = require('aws-sdk');

  // tslint:disable: variable-name
export class ErrorCode {
  public static readonly ConditionalCheckFailed = new ErrorCode('ConditionalCheckFailedException');
  constructor(
    public readonly code: string
  ) {}

  public is(err: Error): boolean {
    return (err as AWS.AWSError).code === this.code;
  }
}
