import { Build } from './build';

/**
 * Encapsulate the entire AWS CDK in a `Build` context so that it can be detached from
 * the runtime bundle.
 *
 * Users of this class should ALWAYS import CDK types as type-only or else module load errors
 * will be thrown at runtime.
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

  public readonly apigateway: typeof import('@aws-cdk/aws-apigateway') = require('@aws-cdk/aws-apigateway');
  public readonly core: typeof import('@aws-cdk/core') = require('@aws-cdk/core');
  public readonly dynamodb: typeof import('@aws-cdk/aws-dynamodb') = require('@aws-cdk/aws-dynamodb');
  public readonly events: typeof import('@aws-cdk/aws-events') = require('@aws-cdk/aws-events');
  public readonly eventsTargets: typeof import('@aws-cdk/aws-events-targets') = require('@aws-cdk/aws-events-targets');
  public readonly glue: typeof import('@aws-cdk/aws-glue') = require('@aws-cdk/aws-glue');
  public readonly iam: typeof import('@aws-cdk/aws-iam') = require('@aws-cdk/aws-iam');
  public readonly kinesis: typeof import('@aws-cdk/aws-kinesis') = require('@aws-cdk/aws-kinesis');
  public readonly kms: typeof import('@aws-cdk/aws-kms') = require('@aws-cdk/aws-kms');
  public readonly lambda: typeof import('@aws-cdk/aws-lambda') = require('@aws-cdk/aws-lambda');
  public readonly lambdaEventSources: typeof import('@aws-cdk/aws-lambda-event-sources') = require('@aws-cdk/aws-lambda-event-sources');
  public readonly logs: typeof import('@aws-cdk/aws-logs') = require('@aws-cdk/aws-logs');
  public readonly s3: typeof import('@aws-cdk/aws-s3') = require('@aws-cdk/aws-s3');
  public readonly sns: typeof import('@aws-cdk/aws-sns') = require('@aws-cdk/aws-sns');
  public readonly sqs: typeof import('@aws-cdk/aws-sqs') = require('@aws-cdk/aws-sqs');
}
