/**
 * Lazy imports of CDK modules.
 *
 * CDK types are imported as transient types because we erase @aws-cdk/* dependencies at runtime.
 */
export class CDK {
  public static get APIGateway() { return require('@aws-cdk/aws-apigateway') as typeof import('@aws-cdk/aws-apigateway'); }
  public static get Core() { return require('@aws-cdk/core') as typeof import('@aws-cdk/core'); }
  public static get DynamoDB() { return require('@aws-cdk/aws-dynamodb') as typeof import('@aws-cdk/aws-dynamodb'); }
  public static get EventsTargets() { return require('@aws-cdk/aws-events-targets') as typeof import('@aws-cdk/aws-events-targets'); }
  public static get Events() { return require('@aws-cdk/aws-events') as typeof import('@aws-cdk/aws-events'); }
  public static get Glue() { return require('@aws-cdk/aws-glue') as typeof import('@aws-cdk/aws-glue'); }
  public static get IAM() { return require('@aws-cdk/aws-iam') as typeof import('@aws-cdk/aws-iam'); }
  public static get Kinesis() { return require('@aws-cdk/aws-kinesis') as typeof import('@aws-cdk/aws-kinesis'); }
  public static get LambdaEventSources() { return require('@aws-cdk/aws-lambda-event-sources') as typeof import('@aws-cdk/aws-lambda-event-sources'); }
  public static get Lambda() { return require('@aws-cdk/aws-lambda') as typeof import('@aws-cdk/aws-lambda'); }
  public static get S3() { return require('@aws-cdk/aws-s3') as typeof import('@aws-cdk/aws-s3'); }
  public static get SNS() { return require('@aws-cdk/aws-sns') as typeof import('@aws-cdk/aws-sns'); }
  public static get SQS() { return require('@aws-cdk/aws-sqs') as typeof import('@aws-cdk/aws-sqs'); }
}
