import { Core, DynamoDB } from 'punchcard';

import { array, string, Record, optional, integer, timestamp, VFunction, } from '@punchcard/shape';
import { ID, Api, Mutation, Subscription, Query, Trait } from 'punchcard/lib/appsync';
import { $util } from 'punchcard/lib/appsync/lang/util';

// define the schema

export class Candidate extends Record('Candidate', {
  id: ID,
  pollCandidatesId: optional(ID),
  image: optional(string),
  name: optional(string),
  upvotes: integer
}) {}

export class CreateCandidateInput extends Record('CandidateInput', {
  image: optional(string),
  name: optional(string),
}) {}

// Polls
export class Poll extends Record('Poll', {
  id: ID,
  name: string,
  type: string,
  itemType: string,
  createdAt: timestamp
}) {}

export class PollCandidates extends Trait(Poll, {
  candidates: VFunction({
    args: {
      nextToken: optional(string),
      limit: optional(integer)
    },
    returns: Record({
      candidates: array(Candidate),
      nextToken: optional(string)
    })
  }),
}) {}

export class CreatePollInput extends Record('CreatePollInput', {
  name: string,
  type: string,
  itemType: string,
  createdAt: timestamp,
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
  id: ID,
  clientId: ID
}) {}

export class UpVote extends Mutation({
  upVote: VFunction({
    args: {
      id: ID,
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

const app = new Core.App();
const stack = app.stack('this-or-that');

// dynamodb stores
const pollStore = new DynamoDB.Table(stack, 'PollStore', {
  data: Poll,
  key: {
    partition: 'id'
  }
});

const byItemType = pollStore.globalIndex({
  indexName: 'byItemType',
  key: {
    partition: 'itemType',
    sort: 'createdAt'
  }
});

const pollMutations = new PollMutations({
  addPoll: {
    *resolve({input}) {
      const id = yield* $util.autoId();
      const createdAt = yield* $util.time.nowISO8601();

      return yield* pollStore.put({
        id,
        createdAt,
        ...input
      });
    }
  }
});

const pollQueries = new PollQueries({
  getPoll: {
    *resolve({id}) {
      return yield* pollStore.get({id});
    }
  }
});

// const pollCandidates = new PollCandidates({
//   candidates: {
//     *resolve({nextToken, limit}) {
//       const query = yield* candidateStore.query({
//         key: {
//           id: this.id
//         },
//         limit,
//         nextToken
//       });

//       return {
//         nextToken: query.nextToken,
//         candidates: query.items
//       };
//     }
//   }
// });

const candidateStore = new DynamoDB.Table(stack, 'CandidateStore', {
  data: Candidate,
  key: {
    partition: 'id',
  }
});

const candidateByPollId = candidateStore.globalIndex({
  indexName: 'byPollId',
  key: {
    partition: 'pollCandidatesId'
  },
});

const upVote = new UpVote({
  upVote: {
    *resolve({id, clientId}) {
      yield* candidateStore.update({
        key: {
          id
        },
        *transaction(candidate) {
          yield* candidate.upvotes.increment();
        }
      });

      return {
        id,
        clientId
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

api.Query(client => ({
  a: client.getPoll
}))
