import { TypeShape } from '@punchcard/shape';
import { Dependency } from '../core/dependency';
import { TriggerHandler } from './trigger-function';
import { TriggerRequest } from './trigger-request';
import { TriggerSource } from './trigger-source';


/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html
 */
export interface AuthenticationTriggers<A extends TypeShape, D extends Dependency<any>> {
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
    PreAuthenticationRequest<A>,
    PreAuthenticationResponse,
    A,
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
    PostAuthenticationRequest<A>,
    PostAuthenticationResponse,
    A,
    D
  >;

  /**
   * Amazon Cognito invokes this trigger before token generation allowing you to customize
   * identity token claims.
   *
   * This Lambda trigger allows you to customize an identity token before it is generated.
   * You can use this trigger to add new claims, update claims, or suppress claims in the
   * identity token. To use this feature, you can associate a Lambda function from the Amazon
   * Cognito User Pools console or by updating your user pool through the AWS CLI.
   *
   * There are some claims which cannot be modified:
   * - `acr`
   * - `amr`
   * - `aud`
   * - `auth_time`
   * - `azp`
   * - `exp`
   * - `iat`
   * - `identities`
   * - `iss`
   * - `sub`
   * - `token_use`
   * - `nonce`
   * - `at_hash`
   * - `cognito:username`.
   *
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html
   */
  preTokenGeneration?: TriggerHandler<
    TriggerSource.TokenGeneration,
    PreTokenGenerationRequest<A>,
    PreTokenGenerationResponse,
    A,
    D
  >;
}

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-authentication.html
 */
export interface PreAuthenticationRequest<A extends TypeShape> extends TriggerRequest<A> {
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
 * In the response, you can set `autoConfirmUser` to `true` if you want to auto-confirm the user.
 *
 * You can set `autoVerifyEmail` to `true` to auto-verify the user's email. You can set `autoVerifyPhone`
 * to `true` to auto-verify the user's phone number.
 *
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-authentication.html
 */
export interface PreAuthenticationResponse {
  /**
   * Set to `true` to auto-confirm the user, or `false` otherwise.
   */
  autoConfirmUser?: boolean;
  /**
   * Set to `true` to set as verified the email of a user who is signing up, or `false` otherwise.
   * If `autoVerifyEmail` is set to `true`, the email attribute must have a valid, non-null value.
   * Otherwise an error will occur and the user will not be able to complete sign-up.
   *
   * If the email attribute is selected as an alias, an alias will be created for the user's email
   * when autoVerifyEmail is set. If an alias with that email already exists, the alias will be moved
   * to the new user and the previous user's email will be marked as unverified. For more information,
   * see [Overview of Aliases](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases).
   */
  autoVerifyEmail?: boolean;
  /**
   * Set to `true` to set as verified the phone number of a user who is signing up, or `false` otherwise.
   * If `autoVerifyPhone` is set to `true`, the `phone_number` attribute must have a valid, non-null value.
   * Otherwise an error will occur and the user will not be able to complete sign-up.
   *
   * If the `phone_number` attribute is selected as an alias, an alias will be created for the user's phone
   * number when autoVerifyPhone is set. If an alias with that phone number already exists, the alias will
   * be moved to the new user and the previous user's phone number will be marked as unverified. For more
   * information, [Overview of Aliases](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases).
   */
  autoVerifyPhone?: boolean;
}

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-authentication.html
 */
export interface PostAuthenticationRequest<A extends TypeShape> extends TriggerRequest<A> {
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
export type PostAuthenticationResponse = void;

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
export interface PreTokenGenerationRequest<A extends TypeShape> extends TriggerRequest<A> {
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
    claimsToAddOrOverride?: {
      [key: string]: string;
    };
    /**
     * A list that contains claims to be suppressed from the identity token.
     *
     * *If a value is both suppressed and replaced, then it will be suppressed.*
     */
    claimsToSuppress?: string[];
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