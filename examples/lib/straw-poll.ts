import { Core, DynamoDB, SQS } from 'punchcard';

import { array, string, Type, optional, integer, timestamp, Fn, map, number, boolean, union, Enum, TypeShape, Fields, Value, } from '@punchcard/shape';
import { ID, Api, Mutation, Subscription, Query, Trait, $if, VObject, vtl, VString, VTL } from 'punchcard/lib/appsync';
import { $util } from 'punchcard/lib/appsync/lang/util';
import { DynamoDSL } from 'punchcard/lib/dynamodb/dsl/dynamo-repr';
import { Records } from 'punchcard/lib/kinesis';

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

export class PollQueries extends Query({
  /**
   * Get a Poll by ID.
   */
  getPoll: Fn({
    /**
     * ID of the Poll.
     */
    id: ID
  }, optional(Poll))
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

const pollQueries = new PollQueries({
  getPoll: {
    *resolve({id}) {
      const poll = yield* pollStore.get({id});

      return yield* VObject.of(Poll, {
        ...poll,
        candidates: poll.candidates.values()
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

const api = new Api(stack, 'StrawPoll', {
  name: 'StrawPoll',
  fragments: [
    upVote,
    voteUpdates,
    pollMutations,
    pollQueries,
  ]
});

// async function main() {
//   const {a,} = await api.Query(client => ({
//     a: client.getFriend({id: 'hazza-bazza'}, person => person
//       .on('Fo', fo => fo
//         .weapon()
//       )
//       .on('Friend', friend => friend
//         .name()
//       )
//     )
//   }));

//   if (a.__typename === 'Fo') {
    
//   }
// }


const resolvers = {
  Friend: {
    id: () => {},
    name: () => {},
    friends: () => {}
  }
}

class Friend extends Type('Friend', {
  id: string,
  name: string
}) {}
class FriendOfFriend extends Trait(Friend, {
  friends: array(Friend)
}) {}

/*
Table1
friendId | id | name

Table2
friendID | relatedFriendId 


type Friend {
  id: String!
  name: String!
  friends: [Friend]
}

query {
  friend {
    id
    friends {
      id
      name
    }
  }
}

*/
