import { Build } from './build';

/**
 * The AWS Universe is a CDK instance in a `Build` contest.
 *
 * Users of this class should ALWAYS import CDK types as type-only.
 *
 * E.g.
 * ```ts
 * import type * as cdk from '@aws-cdk/core`;
 * import type * as lambda from '@aws-cdk/aws-lambda`;
 *
 * // instead of: import * as cdk from '@aws-cdk/core`;
 *
 * // then, access the CDK via the global Build<CDK> context
 * CDK.chain(CDK => app.map(app => {
 *   const stack: cdk.Stack = new CDK.Core.Stack(app, 'my-stack');
 *
 *   const fn: lambda.Function = new CDK.Lambda.Function(stack, 'MyFunc', { .. });
 * });
 * ```
 *
 * This is so the CDK infrastructure code can be erased from the runtime bundle with webpack,
 * drastically reducing the impact of the Punchcard framework on the cold-start.
 */
export const CDK: Build<CDK> = Build.lazy(() => new (CloudDevelopmentKit as any)() as CDK);

export interface CDK extends CloudDevelopmentKit {}

/**
 * Use of this class shouldbe restricted to within a `Build` context, by mapping into the global CDK context.
 *
 * ```ts
 * CDK.map(({lambda, cdk}) => {
 *   // write CDK code
 * })
 * ```
 */
export class CloudDevelopmentKit {
  private constructor() {}

  public get apigateway(): typeof import('@aws-cdk/aws-apigateway') { return require('@aws-cdk/aws-apigateway'); }
  public get core(): typeof import('@aws-cdk/core') { return require('@aws-cdk/core'); }
  public get dynamodb(): typeof import('@aws-cdk/aws-dynamodb') { return require('@aws-cdk/aws-dynamodb'); }
  public get events(): typeof import('@aws-cdk/aws-events') { return require('@aws-cdk/aws-events'); }
  public get eventsTargets(): typeof import('@aws-cdk/aws-events-targets') { return require('@aws-cdk/aws-events-targets'); }
  public get glue(): typeof import('@aws-cdk/aws-glue') { return require('@aws-cdk/aws-glue'); }
  public get iam(): typeof import('@aws-cdk/aws-iam') { return require('@aws-cdk/aws-iam'); }
  public get kinesis(): typeof import('@aws-cdk/aws-kinesis') { return require('@aws-cdk/aws-kinesis'); }
  public get kms(): typeof import('@aws-cdk/aws-kms') { return require('@aws-cdk/aws-kms'); }
  public get lambda(): typeof import('@aws-cdk/aws-lambda') { return require('@aws-cdk/aws-lambda'); }
  public get lambdaEventSources(): typeof import('@aws-cdk/aws-lambda-event-sources') { return require('@aws-cdk/aws-lambda-event-sources'); }
  public get logs(): typeof import('@aws-cdk/aws-logs') { return require('@aws-cdk/aws-logs'); }
  public get s3(): typeof import('@aws-cdk/aws-s3') { return require('@aws-cdk/aws-s3'); }
  public get sns(): typeof import('@aws-cdk/aws-sns') { return require('@aws-cdk/aws-sns'); }
  public get sqs(): typeof import('@aws-cdk/aws-sqs') { return require('@aws-cdk/aws-sqs'); }
}
