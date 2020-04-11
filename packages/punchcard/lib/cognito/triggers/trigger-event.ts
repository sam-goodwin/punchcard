import { TriggerRequest } from './trigger-request';
import { TriggerSource } from './trigger-source';

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html#cognito-user-pools-lambda-trigger-sample-event-parameter-shared
 */
export interface TriggerEvent<T extends TriggerRequest = TriggerRequest, Source extends TriggerSource = TriggerSource> {
  /**
   * The version number of your Lambda function.
   */
  version: string,
  /**
   * The name of the event that triggered the Lambda function. For a description of
   * each triggerSource see [User Pool Lambda Trigger Sources](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html#cognito-user-identity-pools-working-with-aws-lambda-trigger-sources).
   */
  triggerSource: Source,
  /**
   * The AWS Region, as an AWSRegion instance.
   */
  region: string,
  /**
   * The user pool ID for the user pool.
   */
  userPoolId: string,
  /**
   * The username of the current user.
   */
  userName: string,
  /**
   * The caller context.
   */
  callerContext: {
    /**
     * The AWS SDK version number.
     */
    awsSdkVersion: string,
    /**
     * The ID of the client associated with the user pool.
     */
    clientId: string
  },
  /**
   * The request from the Amazon Cognito service.
   */
  request: T;
}
