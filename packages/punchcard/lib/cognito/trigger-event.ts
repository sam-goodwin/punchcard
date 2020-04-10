import { TriggerSource } from './trigger-source';

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html#cognito-user-pools-lambda-trigger-sample-event-parameter-shared
 */
export interface LambdaTriggerEvent {
  /**
   * The version number of your Lambda function.
   */
  version: string,
  /**
   * The name of the event that triggered the Lambda function. For a description of
   * each triggerSource see User Pool Lambda Trigger Sources.
   *
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html#cognito-user-identity-pools-working-with-aws-lambda-trigger-sources
   */
  triggerSource: TriggerSource,
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
   * The caller context, which consists of the following:
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
   * The request from the Amazon Cognito service. This request must include:
   */
  request: {
    /**
     * One or more pairs of user attribute names and values. Each pair is in the form `"name": "value"`.
     */
    userAttributes: {
      [key: string]: string,
    }
  },
  response: {}
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
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-create-auth-challenge.html
 */
export interface CreateAuthChallengeEvent extends LambdaTriggerEvent {
  triggerSource: TriggerSource.CustomAuthenticationChallenge.CreateAuthChallenge_Authentication
  request: LambdaTriggerEvent['request'] & {
    /**
     * The name of the new challenge.
     */
    challengeName: string;
    /**
     * One or more key-value pairs that you can provide as custom input to the Lambda
     * function that you specify for the create auth challenge trigger. You can pass
     * this data to your Lambda function by using the ClientMetadata parameter in the
     * `AdminRespondToAuthChallenge` and `RespondToAuthChallenge` API actions.
     */
    clientMetadata: {
      [key: string]: any;
    }
    /**
     * The session element is an array of `ChallengeResult` elements.
     */
    session: ChallengeResult[];
    /**
     * This boolean is populated when `PreventUserExistenceErrors` is set to `ENABLED`
     * for your User Pool client.
     */
    userNotFound: boolean;
  }
}

export interface CreateAuthResponse {
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
   * This parameter should contain all of the information that is required to validate the
   * user's response to the challenge. In other words, the publicChallengeParameters parameter
   * contains the question that is presented to the user and privateChallengeParameters
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
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-message.html
 */
export interface CustomMessageEvent extends LambdaTriggerEvent {
  triggerSource: TriggerSource.CustomMessage;
  request: LambdaTriggerEvent['request'] & {
    /**
     * A string for you to use as the placeholder for the verification code in the custom message.
     */
    codeParameter: string;
    /**
     * The username parameter. It is a required request parameter for the admin create user flow.
     */
    usernameParameter: string;
    /**
     * One or more key-value pairs that you can provide as custom input to the Lambda function
     * that you specify for the custom message trigger. You can pass this data to your Lambda
     * function by using the ClientMetadata parameter in the following API actions:
     *
     * - AdminResetUserPassword
     * - AdminRespondToAuthChallenge
     * - AdminUpdateUserAttributes
     * - ForgotPassword
     * - GetUserAttributeVerificationCode
     * - ResendConfirmationCode
     * - SignUp
     * - UpdateUserAttributes
     */
    clientMetadata: {
      [key: string]: string;
    }
  }
}

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-message.html
 */
export type CustomMessageResponse = CustomSmsMessage | CustomEmailMessage;

export interface CustomSmsMessage {
  /**
   * The custom SMS message to be sent to your users. Must include the `codeParameter` value received in the request.
   */
  smsMessage: string;
}

export interface CustomEmailMessage {
  /**
   * The custom email message to be sent to your users. Must include the `codeParameter` value received in the request.
   */
  emailMessage: string;
  /**
   * The subject line for the custom message.
   */
  emailSubject: string;
}

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html
 */
export interface PreSignUpEvent extends LambdaTriggerEvent {
  triggerSource: TriggerSource.Authentication.PreSignUp_SignUp;

  request: LambdaTriggerEvent['request'] & {
    /**
     * One or more name-value pairs containing the validation data in the request to register a
     * user. The validation data is set and then passed from the client in the request to register
     * a user. You can pass this data to your Lambda function by using the ClientMetadata parameter
     * in the InitiateAuth and AdminInitiateAuth API actions.
     *
     * @see https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html
     * @see https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminInitiateAuth.html
     */
    validationData: {
      [key: string]: string;
    };

    /**
     * One or more key-value pairs that you can provide as custom input to the Lambda function that
     * you specify for the pre sign-up trigger. You can pass this data to your Lambda function by using
     * the ClientMetadata parameter in the following API actions:
     * - `AdminCreateUser`
     * - `AdminRespondToAuthChallenge`
     * - `ForgotPassword`
     * - `SignUp`
     */
    clientMetadata: {
      [key: string]: string;
    }
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
  autoConfirmUser: boolean;
  /**
   * Set to true to set as verified the email of a user who is signing up, or false otherwise.
   * If autoVerifyEmail is set to true, the email attribute must have a valid, non-null value.
   * Otherwise an error will occur and the user will not be able to complete sign-up.
   *
   * If the email attribute is selected as an alias, an alias will be created for the user's
   * email when autoVerifyEmail is set. If an alias with that email already exists, the alias
   * will be moved to the new user and the previous user's email will be marked as unverified.
   *
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases
   */
  autoVerifyEmail: boolean;
  /**
   * Set to true to set as verified the phone number of a user who is signing up, or false otherwise.
   * If autoVerifyPhone is set to true, the phone_number attribute must have a valid, non-null value.
   * Otherwise an error will occur and the user will not be able to complete sign-up.
   *
   * If the phone_number attribute is selected as an alias, an alias will be created for the user's
   * phone number when autoVerifyPhone is set. If an alias with that phone number already exists, the
   * alias will be moved to the new user and the previous user's phone number will be marked as
   * unverified.
   *
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases
   */
  autoVerifyPhone: boolean;
}

