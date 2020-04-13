import { Dependency } from '../../core/dependency';
import { TriggerRequest } from './trigger-request';
import { TriggerSource } from './trigger-source';
import { TriggerHandler } from './trigger-function';
import { RecordShape } from '@punchcard/shape';

export interface CustomMessageTriggers<A extends RecordShape, D extends Dependency<any>> {
  /**
   * Amazon Cognito invokes this trigger before sending an email or phone verification
   * message or a multi-factor authentication (MFA) code, allowing you to customize
   * the message dynamically.
   *
   * The request includes codeParameter, which is a string that acts as a placeholder
   * for the code that's being delivered to the user. Insert the codeParameter string
   * into the message body, at the position where you want the verification code to be
   * inserted. On receiving this response, the Amazon Cognito service replaces the
   * `codeParameter` string with the actual verification code.
   *
   * A custom message Lambda function with the `CustomMessage_AdminCreateUser` trigger
   * returns a user name and verification code and so the request must include both
   * `request.usernameParameter` and `request.codeParameter`.
   * 
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-message.html
   */
  customMessage?: TriggerHandler<
    TriggerSource.CustomMessage,
    CustomMessageRequest<A>,
    CustomMessageResponse,
    A,
    D>;
}

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-message.html
 */
export interface CustomMessageRequest<A extends RecordShape> extends TriggerRequest<A> {
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
   * 
   * @see https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminResetUserPassword.html
   * @see https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminRespondToAuthChallenge.html
   * @see https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminUpdateUserAttributes.html
   * @see https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ForgotPassword.html
   * @see https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_GetUserAttributeVerificationCode.html
   * @see https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ResendConfirmationCode.html
   * @see https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_SignUp.html
   * @see https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_UpdateUserAttributes.html
   */
  clientMetadata: {
    [key: string]: string;
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