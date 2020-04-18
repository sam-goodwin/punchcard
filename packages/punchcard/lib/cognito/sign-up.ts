import { RecordShape } from '@punchcard/shape';
import { Dependency } from '../core/dependency';
import { TriggerHandler } from './trigger-function';
import { TriggerRequest } from './trigger-request';
import { TriggerSource } from './trigger-source';

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html
 */
export interface SignUpTriggers<A extends RecordShape, D extends Dependency<any>> {
  /**
   * The pre sign-up Lambda function is triggered just before Amazon Cognito signs up a
   * new user. It allows you to perform custom validation to accept or deny the registration
   * request as part of the sign-up process.
   *
   * The request includes validation data from the client which comes from the `ValidationData`
   * values passed to the user pool `SignUp` and `AdminCreateUser` API methods.
   *
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html
   */
  preSignUp?: TriggerHandler<
    TriggerSource.PreSignUp,
    PreSignUpRequest<A>,
    PreSignUpResponse,
    A,
    D
  >;
  /**
   * Amazon Cognito invokes this trigger after a new user is confirmed, allowing you
   * to send custom messages or to add custom logic. For example, you could use this
   * trigger to gather new user data.
   *
   * The request contains the current attributes for the confirmed user.
   *
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-confirmation.html
   */
  postConfirmation?: TriggerHandler<
    TriggerSource.PostConfirmation,
    PostConfirmationRequest<A>,
    PostConfirmationResponse,
    A,
    D
  >;
  /**
   * Amazon Cognito invokes this trigger when a user does not exist in the user pool at the
   * time of sign-in with a password, or in the forgot-password flow. After the Lambda function
   * returns successfully, Amazon Cognito creates the user in the user pool. For details on the
   * authentication flow with the user migration Lambda trigger see [Importing Users into User
   * Pools With a User Migration Lambda Trigger](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-import-using-lambda.html).
   *
   * You can migrate users from your existing user directory into Amazon Cognito User Pools at
   * the time of sign-in, or during the forgot-password flow with this Lambda trigger.
   *
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html
   */
  userMigration?: TriggerHandler<
    TriggerSource.UserMigration,
    UserMigrationRequest<A>,
    UserMigrationResponse,
    A,
    D
  >;
}

export interface PreSignUpRequest<A extends RecordShape> extends TriggerRequest<A> {
  /**
   * One or more key-value pairs that you can provide as custom input to the Lambda function that
   * you specify for the pre sign-up trigger. You can pass this data to your Lambda function by using
   * the ClientMetadata parameter in the following API actions:
   * - [`AdminCreateUser`](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminCreateUser.html)
   * - [`AdminRespondToAuthChallenge`](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminRespondToAuthChallenge.html)
   * - [`ForgotPassword`](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ForgotPassword.html)
   * - [`SignUp`](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_SignUp.html)
   */
  clientMetadata: {
    [key: string]: string;
  }
}

/**
 * In the response, you can set `autoConfirmUser` to true if you want to auto-confirm the user. You
 * can set `autoVerifyEmail` to `true` to auto-verify the user's email. You can set `autoVerifyPhone` to
 * true to auto-verify the user's phone number.
 *
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html
 */
export interface PreSignUpResponse {
  /**
   * Set to true to auto-confirm the user, or false otherwise.
   */
  autoConfirmUser?: boolean;
  /**
   * Set to `true` to set as verified the email of a user who is signing up, or `false` otherwise.
   * If `autoVerifyEmail` is set to true, the email attribute must have a valid, non-null value.
   * Otherwise an error will occur and the user will not be able to complete sign-up.
   *
   * If the email attribute is selected as an alias, an alias will be created for the user's
   * email when `autoVerifyEmail` is set. If an alias with that email already exists, the alias
   * will be moved to the new user and the previous user's email will be marked as unverified.
   *
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases
   */
  autoVerifyEmail?: boolean;
  /**
   * Set to `true` to set as verified the phone number of a user who is signing up, or `false` otherwise.
   * If `autoVerifyPhone` is set to `true`, the `phone_number` attribute must have a valid, non-null value.
   * Otherwise an error will occur and the user will not be able to complete sign-up.
   *
   * If the `phone_number` attribute is selected as an alias, an alias will be created for the user's
   * phone number when `autoVerifyPhone` is set. If an alias with that phone number already exists, the
   * alias will be moved to the new user and the previous user's phone number will be marked as
   * unverified.
   *
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases
   */
  autoVerifyPhone?: boolean;
}

/**
 * Amazon Cognito invokes this trigger after a new user is confirmed, allowing you
 * to send custom messages or to add custom logic. For example, you could use this
 * trigger to gather new user data.
 *
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-confirmation.html
 */
export interface PostConfirmationRequest<A extends RecordShape> extends TriggerRequest<A> {
  /**
   * One or more key-value pairs that you can provide as custom input to the
   * Lambda function that you specify for the post confirmation trigger. You
   * can pass this data to your Lambda function by using the ClientMetadata
   * parameter in the following API actions:
   * - [`AdminConfirmSignUp`](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminConfirmSignUp.html)
   * - [`ConfirmForgotPassword`](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ConfirmForgotPassword.html)
   * - [`ConfirmSignUp`](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ConfirmSignUp.html)
   * - [`SignUp`.](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_SignUp.html)
   */
  clientMetadata: {
    [key: string]: string;
  }
}

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-confirmation.html
 */
export interface PostConfirmationResponse {}

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html
 */
export interface UserMigrationRequest<A extends RecordShape> extends TriggerRequest<A> {
  /**
   * The username entered by the user.
   */
  userName: string;
  /**
   * The password entered by the user for sign-in. It is not set in the forgot-password flow.
   */
  password: string;
  /**
   * One or more key-value pairs containing the validation data in the user's sign-in
   * request. You can pass this data to your Lambda function by using the ClientMetadata
   * parameter in the [`InitiateAuth`](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html)
   * and [`AdminInitiateAuth`](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminInitiateAuth.html)
   * API actions.
   */
  validationData: {
    [key: string]: string;
  }
  /**
   * One or more key-value pairs that you can provide as custom input to the Lambda
   * function that you specify for the migrate user trigger. You can pass this data
   * to your Lambda function by using the ClientMetadata parameter in the
   * [`AdminRespondToAuthChallenge`](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminRespondToAuthChallenge.html)
   * and [`ForgotPassword`](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ForgotPassword.html)
   * API actions.
   */
  clientMetadata: {
    [key: string]: string;
  }
}

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html
 */
export interface UserMigrationResponse {
  /**
   * It must contain one or more name-value pairs representing user attributes to be
   * stored in the user profile in your user pool. You can include both standard and
   * custom user attributes. Custom attributes require the custom: prefix to distinguish
   * them from standard attributes. For more information see Custom attributes.
   *
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-custom-attributes.html
   */
  userAttributes: {
    // TODO: infer from user-pool configuration
    [key: string]: string;
  }

  /**
   * During sign-in, this attribute can be set to `CONFIRMED`, or not set, to auto-confirm
   * your users and allow them to sign-in with their previous passwords. This is the
   * simplest experience for the user.
   *
   * If this attribute is set to `RESET_REQUIRED`, the user is required to change his or her
   * password immediately after migration at the time of sign-in, and your client app needs
   * to handle the `PasswordResetRequiredException` during the authentication flow.
   */
  finalUserStatus: 'CONFIRMED' | 'RESET_REQUIRED' | undefined;
}