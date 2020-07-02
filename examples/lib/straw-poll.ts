import { Core, DynamoDB, SQS } from 'punchcard';

import { array, string, Type, optional, integer, timestamp, Fn, map, number, boolean, union, Enum, TypeShape, Fields, Value, } from '@punchcard/shape';
import { ID, Api, Mutation, Subscription, Query, Trait, $if, VObject, vtl, VString, VTL, VList } from 'punchcard/lib/appsync';
import { $util } from 'punchcard/lib/appsync/lang/util';
import { DynamoDSL } from 'punchcard/lib/dynamodb/dsl/dynamo-repr';

// define the schema
/**
 * type Candidate {
 *   candidate: ID!
 *   answer: String
 *   upvotes: Int
 * }
 */
export class Candidate extends Type('Candidate', {
  /**
   * ID of the Candidate.
   */
  candidateId: ID,
  /**
   * Answer
   */
  answer: optional(string),
  /**
   * Number of votes for this candidate.
   */
  upvotes: integer
}) {}

export class CreateCandidateInput extends Type('CandidateInput', {
  answer: string,
}) {}

// Polls
export class PollData extends Type({
  id: ID,
  name: string,
  createdAt: timestamp,
  candidates: map(Candidate)
}) {}

export class Poll extends Type('Poll', {
  /**
   * ID of the Poll.
   */
  id: ID,
  name: string,
  createdAt: timestamp,
  /**
   * Poll Candidates.
   */
  candidates: array(Candidate),
}) {}

export function createPoll(pollData: VObject.Of<typeof PollData>): VObject.Like<typeof Poll> {
  return {
    ...pollData,
    candidates: pollData.candidates.values()
  };
}

export function *createPolls(pollData: VList<VObject.Of<typeof PollData>>): VTL<VList<VObject.Of<typeof Poll>>> {
  const polls = yield* vtl(array(Poll))`[]`;
  yield * pollData.forEach(function*(poll) {
    yield* polls.add(createPoll(poll));
  });
  return polls;
}

export class CreatePollInput extends Type('CreatePollInput', {
  name: string,
  candidates: array(CreateCandidateInput)
}) {}

/**
 * type Mutation {
 *   addPoll(input: CreatePollInput!): Poll!
 * }
 */
export class PollMutations extends Mutation({
  /**
   * Add a Poll.
   */
  addPoll: Fn({ input: CreatePollInput }, Poll)
}) {}

export class GetPollsResponse extends Type('GetPollsResponse', {
  polls: array(Poll),
  nextToken: optional(string)
}) {}

export class PollQueries extends Query({
  /**
   * Get a Poll by ID.
   */
  getPoll: Fn({
    /**
     * ID of the Poll.
     */
    id: ID
  }, optional(Poll)),

  getPolls: Fn({
    nextToken: optional(string)
  }, GetPollsResponse)
}) {}

export const VoteDirection = Enum('VoteDirection', {
  Up: 'UP',
  Down: 'DOWN'
} as const);

// Votes
export class VoteType extends Type('VoteType', {
  pollId: ID,
  candidateId: ID,
  clientId: ID,
  upvotes: integer,
  direction: VoteDirection
}) {}

export class UpVote extends Mutation({
  upVote: Fn({
    pollId: ID,
    candidateId: ID,
    clientId: ID,
    direction: VoteDirection
  }, VoteType)
}) {}

export class VoteUpdates extends Subscription({
  onUpdateById: Fn({
    pollId: ID
  }, optional(VoteType))
}) {}

// implement the backend

export const app = new Core.App();
const stack = app.stack('straw-poll'); // CFN stack

// dynamodb stores
const pollStore = new DynamoDB.Table(stack, 'PollStore', {
  data: PollData,
  key: {
    partition: 'id'
  }
});

const pollMutations = new PollMutations({
  addPoll: {
    *resolve({input}) {
      const id = yield* $util.autoId();
      const createdAt = yield* $util.time.nowISO8601();

      const candidates = yield* vtl(map(Candidate))`{}`;

      yield* input.candidates.forEach(function*(item, index) {
        const candidateId = index.toString();
        const candidate = yield* VObject.of(Candidate, {
          candidateId,
          upvotes: 0,
          answer: item.answer
        });
        yield* candidates.put(candidateId, candidate);
      });

      yield* $if(id.isEmpty(), function*() {
        throw $util.error('baddy');
      });

      const poll = yield* pollStore.put({
        ...input,
        id,
        createdAt,
        candidates: candidates,
      });

      return yield* VObject.of(Poll, {
        ...poll,
        candidates: poll.candidates.values()
      });
    }
  }
});

const pollIndex = pollStore.globalIndex({
  indexName: 'by-',
  key: {
    partition: 'id',
    sort: 'createdAt'
  }
});

const pollQueries = new PollQueries({
  getPoll: {
    *resolve({id}) {
      const poll = yield* pollStore.get({id});

      return yield* VObject.of(Poll, {
        ...poll,
        candidates: poll.candidates.values()
      });
    }
  },
  getPolls: {
    *resolve() {
      const {items, nextToken} = yield* pollIndex.query({
        where: {
          id: 'id',
          createdAt: t => t.gt(new Date())
        },
      });
      const polls = yield* createPolls(items);

      return yield* VObject.of(GetPollsResponse, {
        polls,
        nextToken
      });
    }
  }
});

const upVote = new UpVote({
  upVote: {
    *resolve({pollId, candidateId, clientId, direction}) {
      const post = yield* pollStore.update({
        key: {
          id: pollId
        },
        *transaction(poll) {
          yield* $if(direction.equals('UP'), function*() {
            yield* poll.candidates.get(candidateId).M.upvotes.increment();
          }).else(function*() {
            yield* poll.candidates.get(candidateId).M.upvotes.increment(-1);
          })
        },
        *condition(poll) {
          yield* DynamoDSL.expect(poll.candidates.has(candidateId));
        },
      });

      return yield* VObject.of(VoteType, {
        pollId,
        candidateId,
        clientId,
        direction,
        upvotes: post.candidates.get(candidateId).upvotes
      });
    }
  }
});

const voteUpdates = new VoteUpdates({
  onUpdateById: {
    subscribe: [
      upVote.subscription('upVote')
    ]
  }
});

new Api(stack, 'StrawPoll', {
  name: 'StrawPoll',
  fragments: [
    upVote,
    voteUpdates,
    pollMutations,
    pollQueries,
  ]
});
