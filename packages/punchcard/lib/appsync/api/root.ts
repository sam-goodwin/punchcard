import { Record } from "@punchcard/shape";

/**
 * Root of the Mutation type-system.
 */
export class MutationRoot extends Record('Mutation', {}) {}

export namespace MutationRoot {
  export type FQN = typeof MutationRoot.FQN;
}

/**
 * Root of the Query type-system.
 */
export class QueryRoot extends Record('Query', {}) {}

export namespace QueryRoot {
  export type FQN = typeof QueryRoot.FQN;
}

/**
 * Root of the Subscription type-system.
 */
export class SubscriptionRoot extends Record('Subscription', {}) {}

export namespace SubscriptionRoot {
  export type FQN = typeof SubscriptionRoot.FQN;
}