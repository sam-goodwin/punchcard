import { TypeShape, Value } from '@punchcard/shape';

export interface TriggerRequest<A extends TypeShape> {
  /**
   * One or more pairs of user attribute names and values. Each pair is in the form `"name": "value"`.
   */
  userAttributes: Value.Of<A>;
}