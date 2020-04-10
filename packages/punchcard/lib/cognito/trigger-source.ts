/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html#cognito-user-pools-lambda-trigger-sample-event-parameter-shared
 */
export type TriggerSource =
  | TriggerSource.Authentication
  | TriggerSource.CustomAuthenticationChallenge
  | TriggerSource.PreTokenGeneration
  | TriggerSource.MigrateUser
  | TriggerSource.CustomMessage
  ;
export namespace TriggerSource {
  export enum Authentication {
    PreSignUp_SignUp = 'PreSignUp_SignUp',
    PreSignUp_AdminCreateUser = 'PreSignUp_AdminCreateUser',
    PostConfirmation_ConfirmSignUp = 'PostConfirmation_ConfirmSignUp',
    PostConfirmation_ConfirmForgotPassword = 'PostConfirmation_ConfirmForgotPassword',
    PreAuthentication_Authentication = 'PreAuthentication_Authentication',
    PostAuthentication_Authentication = 'PostAuthentication_Authentication',
  }

  export enum CustomAuthenticationChallenge {
    DefineAuthChallenge_Authentication = 'DefineAuthChallenge_Authentication',
    CreateAuthChallenge_Authentication = 'CreateAuthChallenge_Authentication',
    VerifyAuthChallengeResponse_Authentication = 'VerifyAuthChallengeResponse_Authentication'
  }

  export enum PreTokenGeneration {
    TokenGeneration_HostedAuth = 'TokenGeneration_HostedAuth',
    TokenGeneration_Authentication = 'TokenGeneration_Authentication',
    TokenGeneration_NewPasswordChallenge = 'TokenGeneration_NewPasswordChallenge',
    TokenGeneration_AuthenticateDevice = 'TokenGeneration_AuthenticateDevice',
    TokenGeneration_RefreshTokens = 'TokenGeneration_RefreshTokens',
  }

  export enum MigrateUser {
    UserMigration_Authentication = 'UserMigration_Authentication',
    UserMigration_ForgotPassword = 'UserMigration_ForgotPassword',
  }

  export enum CustomMessage {
    CustomMessage_SignUp = 'CustomMessage_SignUp',
    CustomMessage_AdminCreateUser = 'CustomMessage_AdminCreateUser',
    CustomMessage_ResendCode = 'CustomMessage_ResendCode',
    CustomMessage_ForgotPassword = 'CustomMessage_ForgotPassword',
    CustomMessage_UpdateUserAttribute = 'CustomMessage_UpdateUserAttribute',
    CustomMessage_VerifyUserAttribute = 'CustomMessage_VerifyUserAttribute',
    CustomMessage_Authentication = 'CustomMessage_Authentication'
  }
}
