export interface TriggerRequest {
  /**
   * One or more pairs of user attribute names and values. Each pair is in the form `"name": "value"`.
   */
  userAttributes: {
    [key: string]: string,
  }
}