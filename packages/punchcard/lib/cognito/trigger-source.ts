/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html#cognito-user-pools-lambda-trigger-sample-event-parameter-shared
 */
export type TriggerSource =
  | TriggerSource.Authentication
  | TriggerSource.CustomAuthentication
  | TriggerSource.CustomMessage
  | TriggerSource.PostConfirmation
  | TriggerSource.PreSignUp
  | TriggerSource.TokenGeneration
  | TriggerSource.UserMigration
;
export namespace TriggerSource {
  export const isPreSignUp = (a: any): a is PreSignUp =>
    a === PreSignUp.AdminCreateUser ||
    a === PreSignUp.SignUp
  ;
  export const isPostConfirmation = (a: any): a is PostConfirmation =>
    a === PostConfirmation.ConfirmForgotPassword ||
    a === PostConfirmation.ConfirmSignUp
  ;
  export const isUserMigration = (a: any): a is UserMigration =>
    a === UserMigration.Authentication ||
    a === UserMigration.ForgotPassword
  ;
  export const isTokenGeneration = (a: any): a is TokenGeneration =>
    a === TokenGeneration.AuthenticateDevice ||
    a === TokenGeneration.Authentication ||
    a === TokenGeneration.HostedAuth ||
    a === TokenGeneration.NewPasswordChallenge ||
    a === TokenGeneration.RefreshTokens
  ;
  export enum PreSignUp {
    AdminCreateUser = 'PreSignUp_AdminCreateUser',
    SignUp = 'PreSignUp_SignUp',
  }
  export enum PostConfirmation {
    ConfirmForgotPassword = 'PostConfirmation_ConfirmForgotPassword',
    ConfirmSignUp = 'PostConfirmation_ConfirmSignUp',
  }
  export enum UserMigration {
    Authentication = 'UserMigration_Authentication',
    ForgotPassword = 'UserMigration_ForgotPassword',
  }
  export enum Authentication {
    PreAuthentication = 'PreAuthentication_Authentication',
    PostAuthentication = 'PostAuthentication_Authentication',
  }
  export enum TokenGeneration {
    AuthenticateDevice = 'TokenGeneration_AuthenticateDevice',
    Authentication = 'TokenGeneration_Authentication',
    HostedAuth = 'TokenGeneration_HostedAuth',
    NewPasswordChallenge = 'TokenGeneration_NewPasswordChallenge',
    RefreshTokens = 'TokenGeneration_RefreshTokens',
  }
  export enum CustomAuthentication {
    DefineAuthChallenge = 'DefineAuthChallenge_Authentication',
    CreateAuthChallenge = 'CreateAuthChallenge_Authentication',
    VerifyAuthChallengeResponse = 'VerifyAuthChallengeResponse_Authentication'
  }
  export enum CustomMessage {
    AdminCreateUser = 'CustomMessage_AdminCreateUser',
    Authentication = 'CustomMessage_Authentication',
    ForgotPassword = 'CustomMessage_ForgotPassword',
    ResendCode = 'CustomMessage_ResendCode',
    SignUp = 'CustomMessage_SignUp',
    UpdateUserAttribute = 'CustomMessage_UpdateUserAttribute',
    VerifyUserAttribute = 'CustomMessage_VerifyUserAttribute',
  }
}

