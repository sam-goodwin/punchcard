/**
 * Lazy imports of CDK modules.
 *
 * CDK types are imported as transient types because we erase @aws-cdk/* dependencies at runtime.
 */
export class CDK {
  public static get APIGateway(): typeof import('@aws-cdk/aws-apigateway') { return require('@aws-cdk/aws-apigateway'); }
  public static get Core(): typeof import('@aws-cdk/core') { return require('@aws-cdk/core'); }
  public static get DynamoDB(): typeof import('@aws-cdk/aws-dynamodb') { return require('@aws-cdk/aws-dynamodb'); }
  public static get EventsTargets(): typeof import('@aws-cdk/aws-events-targets') { return require('@aws-cdk/aws-events-targets'); }
  public static get Events(): typeof import('@aws-cdk/aws-events') { return require('@aws-cdk/aws-events'); }
  public static get Glue(): typeof import('@aws-cdk/aws-glue') { return require('@aws-cdk/aws-glue'); }
  public static get IAM(): typeof import('@aws-cdk/aws-iam') { return require('@aws-cdk/aws-iam'); }
  public static get Kinesis(): typeof import('@aws-cdk/aws-kinesis') { return require('@aws-cdk/aws-kinesis'); }
  public static get LambdaEventSources(): typeof import('@aws-cdk/aws-lambda-event-sources') { return require('@aws-cdk/aws-lambda-event-sources'); }
  public static get Lambda(): typeof import('@aws-cdk/aws-lambda') { return require('@aws-cdk/aws-lambda'); }
  public static get S3(): typeof import('@aws-cdk/aws-s3') { return require('@aws-cdk/aws-s3'); }
  public static get SNS(): typeof import('@aws-cdk/aws-sns') { return require('@aws-cdk/aws-sns'); }
  public static get SQS(): typeof import('@aws-cdk/aws-sqs') { return require('@aws-cdk/aws-sqs'); }
}
