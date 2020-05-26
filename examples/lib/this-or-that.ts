import { Core, DynamoDB } from 'punchcard';

import { array, string, Record, optional, integer, timestamp, VFunction, map, } from '@punchcard/shape';
import { ID, Api, Mutation, Subscription, Query, Trait, $if, VObject, vtl, VString } from 'punchcard/lib/appsync';
import { $util } from 'punchcard/lib/appsync/lang/util';
import { DynamoDSL } from 'punchcard/lib/dynamodb/dsl/dynamo-repr';

// define the schema

export class Candidate extends Record('Candidate', {
  id: ID,
  pollId: optional(ID),
  image: optional(string),
  name: optional(string),
  upvotes: integer
}) {}

export class CreateCandidateInput extends Record('CandidateInput', {
  image: optional(string),
  name: string,
}) {}

// Polls
export class PollData extends Record({
  id: ID,
  name: string,
  createdAt: timestamp,
  candidates: map(Candidate)
}) {}

export class Poll extends Record('Poll', {
  ...PollData.Members,
  candidates: array(Candidate)
}) {}

export function createPoll(pollData: VObject.Of<typeof PollData>): VObject.Like<typeof Poll> {
  return {
    ...pollData,
    candidates: pollData.candidates.values()
  };
}

export class CreatePollInput extends Record('CreatePollInput', {
  name: string,
  candidates: array(CreateCandidateInput)
}) {}

export class PollMutations extends Mutation({
  addPoll: VFunction({
    args: {
      input: CreatePollInput
    },
    returns: Poll
  }),
}) {}

export class PollQueries extends Query({
  getPoll: VFunction({
    args: { id: ID },
    returns: optional(Poll)
  })
}) {}

// Votes
export class VoteType extends Record('VoteType', {
  pollId: ID,
  candidateId: ID,
  clientId: ID,
  upvotes: integer
}) {}

export class UpVote extends Mutation({
  upVote: VFunction({
    args: {
      pollId: ID,
      candidateId: ID,
      clientId: ID
    },
    returns: VoteType
  })
}) {}

export class VoteUpdates extends Subscription({
  onUpdateById: VFunction({
    args: {
      id: ID
    },
    returns: optional(VoteType)
  })
}) {}

// implement the backend

export const app = new Core.App();
const stack = app.stack('this-or-that');

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

      yield* input.candidates.forEach(function*(item) {
        const candidateId = yield* $util.autoId();
        const candidate = yield* VObject.of(Candidate, {
          id: yield* $util.autoId(),
          upvotes: 0,
          pollId: id,
          ...item
        });
        yield* candidates.put(candidateId, candidate);
      });

      const post = yield* pollStore.put({
        ...input,
        id,
        createdAt,
        candidates: candidates,
      });

      return createPoll(post);
    }
  }
});

const pollQueries = new PollQueries({
  getPoll: {
    *resolve({id}) {
      return createPoll(yield* pollStore.get({id}));
    }
  }
});

const upVote = new UpVote({
  upVote: {
    *resolve({pollId, candidateId, clientId}) {
      const post = yield* pollStore.update({
        key: {
          id: pollId
        },
        *transaction(poll) {
          yield* poll.candidates.get(candidateId).M.upvotes.increment();
        },
        *condition(poll) {
          yield* DynamoDSL.expect(poll.id.exists());
        },
      });

      return {
        pollId,
        candidateId,
        clientId,
        upvotes: post.candidates.get(candidateId).upvotes
      }
    }
  }
});

const voteUpdates = new VoteUpdates({
  onUpdateById: {
    subscribe: [
      upVote.subscription('upVote')
    ]
  }
})

const api = new Api(stack, 'ThisOrThatApi', {
  name: 'ThisOrThatApi',
  fragments: [
    upVote,
    voteUpdates,
    pollMutations,
    pollQueries
  ]
});
