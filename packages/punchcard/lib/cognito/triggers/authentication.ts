import { TriggerRequest } from './trigger-request';
import { Dependency } from '../../core/dependency';
import { TriggerHandler } from './trigger-function';
import { TriggerSource } from './trigger-source';


/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html
 */
export interface AuthenticationTriggers<D extends Dependency<any>> {
  /**
   * Amazon Cognito invokes this trigger when a user attempts to sign in, allowing
   * custom validation to accept or deny the authentication request.
   *
   * Triggers are dependant on the user existing in the user pool before trigger activation.
   *
   * The request includes validation data from the client which comes from the `ClientMetadata`
   * values passed to the user pool `InitiateAuth` and `AdminInitiateAuth` API methods.
   * 
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-authentication.html
   */
  preAuthentication?: TriggerHandler<
    TriggerSource.Authentication.PreAuthentication,
    PreAuthenticationRequest,
    PreAuthenticationResponse,
    D
  >;
  /**
   * Amazon Cognito invokes this trigger after signing in a user, allowing you to add custom
   * logic after authentication.
   *
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-authentication.html
   */
  postAuthentication?: TriggerHandler<
    TriggerSource.Authentication.PostAuthentication,
    PostAuthenticationRequest,
    PostAuthenticationResponse,
    D
  >;

  /**
   * A pre-token-generation AWS Lambda trigger.
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html
   */
  preTokenGeneration?: TriggerHandler<
    TriggerSource.TokenGeneration,
    PostAuthenticationRequest,
    PostAuthenticationResponse,
    D
  >;
}

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-authentication.html
 */
export interface PreAuthenticationRequest extends TriggerRequest {
  /**
   * This boolean is populated when `PreventUserExistenceErrors` is set to `ENABLED`
   * for your User Pool client.
   */
  userNotFound: boolean;
  /**
   * One or more name-value pairs containing the validation data in the request to register a
   * user. The validation data is set and then passed from the client in the request to register
   * a user. You can pass this data to your Lambda function by using the ClientMetadata parameter
   * in the [InitiateAuth](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html)
   * and [AdminInitiateAuth](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminInitiateAuth.html)
   * API actions.
   */
  validationData: {
    [key: string]: string;
  };
}

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-authentication.html
 */
export interface PreAuthenticationResponse {}

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-authentication.html
 */
export interface PostAuthenticationRequest extends TriggerRequest {
  /**
   * This flag indicates if the user has signed in on a new device. It is set only if the
   * remembered devices value of the user pool is set to `Always` or `User Opt-In`.
   */
  newDeviceUsed: boolean;
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
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-authentication.html
 */
export interface PostAuthenticationResponse {}

export interface GroupConfiguraion {
  /**
   * A list of the group names that are associated with the user that the identity token is issued for.
   */
  groupsToOverride: string[];
  /**
   * A list of the current IAM roles associated with these groups.
   */
  iamRolesToOverride: string[];
  /**
   * A string indicating the preferred IAM role.
   */
  preferredRole: string;
}

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html
 */
export interface PreTokenGenerationRequest extends TriggerRequest {
  /**
   * The input object containing the current group configuration.
   */
  groupConfiguration: GroupConfiguraion;
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
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html
 */
export interface PreTokenGenerationResponse {
  claimsOverrideDetails: {
    /**
     * A map of one or more key-value pairs of claims to add or override.
     * For group related claims, use `groupOverrideDetails` instead.
     */
    claimsToAddOrOverride: {
      [key: string]: string;
    };
    /**
     * A list that contains claims to be suppressed from the identity token.
     * 
     * *If a value is both suppressed and replaced, then it will be suppressed.*
     */
    claimsToSuppress: string[];
  };
  /**
   * The output object containing the current group configuration.
   *
   * The groupOverrideDetails object is replaced with the one you provide. If you provide
   * an empty or null object in the response, then the groups are suppressed.
   * To leave the existing group configuration as is, copy the value of the request's
   * `groupConfiguration` object to the `groupOverrideDetails` object in the response,
   * and pass it back to the service.
   */
  groupOverrideDetails?: GroupConfiguraion;
}