import { RecordShape } from '@punchcard/shape';
import { Dependency } from '../core/dependency';
import { TriggerHandler } from './trigger-function';
import { TriggerRequest } from './trigger-request';
import { TriggerSource } from './trigger-source';

/**
 * Amazon Cognito user pools also enable custom authentication flows, which can help you
 * create a challenge/response-based authentication model using AWS Lambda triggers.
 *
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html#amazon-cognito-user-pools-custom-authentication-flow
 */
export interface CustomAuthenticationTriggers<A extends RecordShape, D extends Dependency<any>> {
  /**
   * Amazon Cognito invokes this trigger to initiate the custom authentication flow.
   *
   * The request contains session, which is an array containing all of the
   * challenges that are presented to the user in the authentication process that is
   * underway, along with the corresponding result. The challenge details (`ChallengeResult`)
   * are stored in chronological order in the session array, with `session[0]` representing
   * the first challenge that is presented to the user.
   *
   * The challenge loop will repeat until all challenges are answered.
   *
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-define-auth-challenge.html
   */
  defineAuthChallenge?: TriggerHandler<
    TriggerSource.CustomAuthentication.DefineAuthChallenge,
    DefineAuthChallengeRequest<A>,
    DefineAuthChallengeResponse,
    A,
    D
  >;
  /**
   * Amazon Cognito invokes this trigger after Define Auth Challenge if a custom challenge
   * has been specified as part of the Define Auth Challenge trigger. It creates a custom
   * authentication flow.
   *
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-create-auth-challenge.html
   */
  createAuthChallenge?: TriggerHandler<
    TriggerSource.CustomAuthentication.CreateAuthChallenge,
    CreateAuthChallengeRequest<A>,
    CreateAuthChallengeResponse,
    A,
    D
  >;
  /**
   * Amazon Cognito invokes this trigger to verify if the response from the end user for a
   * custom Auth Challenge is valid or not. It is part of a user pool custom authentication flow.
   *
   * The request for this trigger contains the `privateChallengeParameters` and `challengeAnswer`
   * parameters. The `privateChallengeParameters` values are returned by the Create Auth Challenge
   * Lambda trigger and will contain the expected response from the user. The `challengeAnswer`
   * parameter contains the user's response for the challenge.
   *
   * The response contains the `answerCorrect` attribute, which is set to `true` if the user
   * successfully completed the challenge, or `false` otherwise.
   *
   * The challenge loop will repeat until all challenges are answered.
   *
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-verify-auth-challenge-response.html
   */
  verifyAuthChallengeResponse?: TriggerHandler<
    TriggerSource.CustomAuthentication.VerifyAuthChallengeResponse,
    VerifyAuthChallengeRequest<A>,
    VerifyAuthChallengeResponse,
    A,
    D
  >;
}

export enum ChallengeName {
  ADMIN_NO_SRP_AUTH = 'ADMIN_NO_SRP_AUTH',
  CUSTOM_CHALLENGE = 'CUSTOM_CHALLENGE',
  DEVICE_PASSWORD_VERIFIER = 'DEVICE_PASSWORD_VERIFIER',
  DEVICE_SRP_AUTH = 'DEVICE_SRP_AUTH',
  PASSWORD_VERIFIER = 'PASSWORD_VERIFIER',
  SMS_MFA = 'SMS_MFA',
}

export interface ChallengeResult {
  /**
   * The challenge type.
   */
  challengeName: ChallengeName;
  /**
   * Set to true if the user successfully completed the challenge, or false otherwise.
   */
  challengeResult: boolean;
  /**
   * Your name for the custom challenge. Used only if `challengeName` is `"CUSTOM_CHALLENGE".
   */
  challengeMetadata: string;
}

/**
 * Common properties in Auth Challenge requests.
 *
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html#amazon-cognito-user-pools-custom-authentication-flow
 */
interface BaseAuthChallengeRequest<A extends RecordShape> extends TriggerRequest<A> {
  /**
   * The session element is an array of `ChallengeResult` elements.
   */
  session: ChallengeResult[];

  /**
   * One or more key-value pairs that you can provide as custom input to the Lambda function that
   * you specify for the post authentication trigger. You can pass this data to your Lambda function
   * by using the ClientMetadata parameter in the [AdminRespondToAuthChallenge](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminRespondToAuthChallenge.html)
   * and [RespondToAuthChallenge](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_RespondToAuthChallenge.html)
   * API actions.
   */
  clientMetadata: {
    [key: string]: string;
  }
}

/**
 * Request payload for the Define Auth Challenge event.
 *
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-define-auth-challenge.html
 */
export interface DefineAuthChallengeRequest<A extends RecordShape> extends BaseAuthChallengeRequest<A> {
  /**
   * This boolean is populated when `PreventUserExistenceErrors` is set to `ENABLED`
   * for your User Pool client.
   */
  userNotFound: boolean;
}

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-define-auth-challenge.html
 */
export interface DefineAuthChallengeResponse {
  /**
   * A string containing the name of the next challenge. If you want to present a new
   * challenge to your user, specify the challenge name here.
   */
  challengeName: ChallengeName;
  /**
   * Set to `true` if you determine that the user has sufficiently authenticated by
   * completing the challenges, or `false` otherwise.
   */
  issueTokens: boolean;
  /**
   * Set to `true` if you want to terminate the current authentication process, or `false` otherwise.
   */
  failAuthentication: boolean;
}

export interface CreateAuthChallengeRequest<A extends RecordShape> extends BaseAuthChallengeRequest<A> {
  /**
   * The name of the new challenge.
   */
  challengeName: string;
  /**
   * This boolean is populated when `PreventUserExistenceErrors` is set to `ENABLED`
   * for your User Pool client.
   */
  userNotFound: boolean;
}

/**
 * Response to the Create Auth Challenge event.
 *
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-create-auth-challenge.html
 */
export interface CreateAuthChallengeResponse {
  /**
   * One or more key-value pairs for the client app to use in the challenge to be presented
   * to the user. This parameter should contain all of the necessary information to accurately
   * present the challenge to the user.
   */
  publicChallengeParameters: {
    [key: string]: any;
  };
  /**
   * This parameter is only used by the Verify Auth Challenge Response Lambda trigger.
   *
   * This parameter should contain all of the information that is required to validate the
   * user's response to the challenge. In other words, the `publicChallengeParameters` parameter
   * contains the question that is presented to the user and `privateChallengeParameters`
   * contains the valid answers for the question.
   */
  privateChallengeParameters?: {
    [key: string]: any;
  };
  /**
   * Your name for the custom challenge, if this is a custom challenge.
   */
  challengeMetadata?: string;
}

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-verify-auth-challenge-response.html
 */
export interface VerifyAuthChallengeRequest<A extends RecordShape> extends TriggerRequest<A>, CreateAuthChallengeResponse {
  /**
   * The answer from the user's response to the challenge.
   */
  challengeAnswer: {
    [key: string]: string;
  };
}

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-verify-auth-challenge-response.html
 */
export interface VerifyAuthChallengeResponse {
  /**
   * Set to `true` if the user has successfully completed the challenge, or `false` otherwise.
   */
  answerCorrect: boolean;
}