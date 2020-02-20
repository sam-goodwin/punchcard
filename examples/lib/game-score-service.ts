import { Core, DynamoDB, Api } from 'punchcard';
import { string, integer, Record, Minimum, optional, array, boolean, nothing, Maximum, timestamp } from '@punchcard/shape';
import { Ok, Operation, Fail } from 'punchcard/lib/api';

import VTL = require('@punchcard/shape-velocity-template');

/**
 * Create a new Punchcard Application.
 */
export const app = new Core.App();

/**
 * Create a CloudFormation stack with the AWS CDK.
 */
const stack = app.stack('game-score-service');

class InternalServerError extends Record({
  errorMessage: string
}) {}

/**
 * Record of data to maintain a user's statistics for a game.
 */
class UserGameScore extends Record({
  /**
   * User ID
   */
  userId: string,
  /**
   * Title of the game played.
   */
  gameId: string,
  /**
   * Top score achieved on this game.
   * Minimum: 0
   */
  topScore: integer
    .apply(Minimum(0)),
  /**
   * Number of times the player won the game.
   */
  wins: integer
    .apply(Minimum(0)),
  /**
   * Numer of times the player lost the game.
   */
  losses: integer
    .apply(Minimum(0)),
  /**
   * Version of the DynamoDB record - use for optimistic locking.
   */
  version: integer
})
.Deriving(VTL.Factory) {}

namespace UserGameScore {
  export class Key extends UserGameScore.Pick(['userId', 'gameId']) {}
}
/**
 * DynamoDB Table storing the User-Game statistics. 
 */
const UserScores = new DynamoDB.Table(stack, 'ScoreStore', {
  data: UserGameScore,
  key: {
    partition: 'userId',
    sort: 'gameId'
  }
});

const endpoint = new Api.Endpoint();

export const GameService = new Api.Service({
  serviceName: 'game-service',
});

class GetTimeRequest extends Record({
  /**
   * Epoch. `hi`.
   */
  epoch: integer
}).Deriving(VTL.Factory) {}

class GetTimeResponse extends Record({
  currentTime: timestamp
}).Deriving(VTL.Factory) {}

const GetTimeHandler = new Api.Handler({
  input: GetTimeRequest,
  output: GetTimeResponse,
  endpoint,
}, async request =>
  Ok(new GetTimeResponse({
    currentTime: new Date(request.epoch)
  }))
);

const GetTime = GameService.addOperation('GetTime', {
  input: GetTimeRequest,
  output: GetTimeResponse
}, input => GetTimeHandler.call(input.request));

// /user/<userId>
const User = GameService.addResource({
  name: 'user',
  identifiers: {
    userId: string
  }
});

/**
 * POST: /user
 */
class CreateUserRequest extends Record({
  userName: string
}) {}
class CreateUserResponse extends Record({
  userId: string
}) {}
const CreateUserHandler = new Api.Handler({
  input: string,
  output: CreateUserResponse,
  endpoint
}, async (request) => {
  return Ok(new CreateUserResponse({
    userId: `todo: ${request}`
  }))
});
const CreateUser = User.onCreate(CreateUserRequest,
  request => CreateUserHandler.call(request.userName).userId);

// PUT: /user/<userId>
class UpdateUserRequest extends Record({
  userId: string
}) {}
const UpdateUserHandler = new Api.Handler({
  endpoint,
  input: UpdateUserRequest,
  output: nothing
}, async () => Ok(null));
const UpdateUser = User.onUpdate(UpdateUserRequest, request => UpdateUserHandler.call(request));

/**
 * GET: /user/<userId>
 */
class GetUserRequest extends Record({
  userId: string
}) {}
class GetUserResponse extends Record({
  userName: string
}) {}
const GetUserHandler = new Api.Handler({
  endpoint,
  input: GetUserRequest,
  output: GetUserResponse
}, async (userId) => {
  // TODO: lookup user in DDB
  return Ok(new GetUserResponse({
    userName: `todo: ${userId}` 
  }));
});
const GetUser = User.onGet(GetUserRequest, request => GetUserHandler.call(request));

/**
 * /score/<scoreId>
 */
const Score = GameService.addResource({
  name: 'score',
  identifiers: {
    scoreId: string
  }
});

/**
 * A request to submit a new game score for a user.
 */
class SubmitScoreRequest extends Record({
  /**
   * User ID
   */
  userId: string,
  /**
   * Id of the game played.
   */
  gameId: string,
  /**
   * Did the player win or lose?
   */
  victory: boolean,
  /**
   * Game score achieved.
   * Minimum: 0
   */
  score: integer
    .apply(Minimum(0)),
}) { }

const SubmitScoreCall = new Api.Handler({
  endpoint,
  input: SubmitScoreRequest,
  output: nothing,
  errors: {
    InternalServerError
  },
  depends: UserScores.readWriteAccess()
}, async (request, highScores) => {
  const key = new UserGameScore.Key({
    userId: request.userId,
    gameId: request.gameId
  });
  try {
    await update();
    return Ok(null);
  } catch (err) {
    return Fail('InternalServerError', new InternalServerError({
      errorMessage: err.message
    }));
  }

  async function update() {
    const gameScore = await highScores.get(key);
    if (gameScore) {
      try {
        /**
         * If the record already exists, then use an efficient update expression to 
         * safely, and atomically update the game score in DynamoDB.
         */
        await highScores.update(key, {
          /**
           * Ensure that there was no concurrent modification
           */
          if: _ => _.version.equals(gameScore.version),
          /**
           * increment, wins, losses and record the top score
           */
          actions: _ => [
            _.losses.increment(request.victory ? 0 : 1),
            _.wins.increment(request.victory ? 1 : 0),
            _.topScore.set(request.score > gameScore.topScore ? request.score : gameScore.topScore),
            _.version.increment()
          ]
        });
      } catch (err) {
        console.error(err);
        if (err.code === 'ConditionCheckFailedException') {
          /**
           * Record was concurrently modified - start again.
           */
          await update();
        } else {
          throw err;
        }
      }
    } else {
      try {
        /**
         * No record exists, so put the initial value.
         */
        await highScores.put(new UserGameScore({
          gameId: request.gameId,
          losses: request.victory ? 0 : 1,
          wins: request.victory ? 1 : 0,
          topScore: request.score,
          userId: request.userId,
          version: 1
        }), {
          /**
           * Don't overwrite if a score was submitted in-between our get request.
           */
          if: _ => _.userId.notExists()
        });
      } catch (err) {
        if (err.code === 'ConditionCheckFailedException') {
          /**
           * A record was put before we could submit our request, start again.
           */
          await update();
        } else {
          throw err;
        }
      }
    }
  };
});

/**
 * POST: /score {
 *   userId: string,
 *   gameId: string,
 *   victory: boolean,
 *   score: number
 * }
 */
const SubmitScore = Score.onCreate(SubmitScoreRequest, request => SubmitScoreCall.call(request));

/**
 * Global Secondary Index to lookup a game title's high scores.
 */
const HighScores = UserScores.globalIndex({
  indexName: 'high-scores',
  key: {
    partition: 'gameId',
    sort: 'topScore'
  }
});

/**
 * Helper class for creating and passing around keys of the High Score Index.
 */
class HighScoresKey extends UserGameScore.Pick(['gameId', 'topScore']) {}

/**
 * A request for a game's high scores.
 */
class ListHighScoresRequest extends Record({
  /**
   * Id of game to query for high scores.
   */
  gameId: string,
  /**
   * Max number of results to return.
   * 
   * Minimum: 0
   * Maximum: 1000
   * 
   * @default 100
   */
  maxResults: optional(integer)
    .apply(Minimum(0))
    .apply(Maximum(1000))
}) {}

const ListHighScoresHandler = new Api.Handler({
  endpoint,
  input: ListHighScoresRequest,
  /**
   * Returns an array of `UserGameScore` objects.
   */
  output: array(UserGameScore),
  /**
   * Enumeration of errors returned by ListHighScores.
   */
  errors: {
    InternalServerError
  },
  /**
   * We need reac access to the HighScores index to lookup results.
   */
  depends: HighScores.readAccess(),
}, async (request, highScores) => {
  const maxResults = request.maxResults === undefined ? 100 : request.maxResults;
  try {
    return Ok(await query([]));
  } catch (err) {
    return Fail('InternalServerError', new InternalServerError({
      errorMessage: err.message
    }));
  }
  
  async function query(scores: UserGameScore[], LastEvaluatedKey?: HighScoresKey): Promise<UserGameScore[]> {
    const numberToFetch = Math.min(maxResults - scores.length, 100);
    const nextScores = await highScores.query({
      gameId: request.gameId,
      topScore: _ => _.greaterThan(0)
    }, {
      Limit: numberToFetch,
      ExclusiveStartKey: LastEvaluatedKey,
      ScanIndexForward: false
    });

    scores = scores.concat(nextScores.Items!);

    if (!nextScores.LastEvaluatedKey || scores.length >= maxResults) {
      return scores;
    }

    return await query(scores, nextScores.LastEvaluatedKey);
  }
})

/**
 * Lambda Function to get High Scores for a given game.
 * 
 * GET: /score?gameId=<gameId>&maxResults=100
 */
const ListHighScores = Score.onList(ListHighScoresRequest, request => ListHighScoresHandler.call(request));
