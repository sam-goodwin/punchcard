import { Core, Lambda, DynamoDB } from 'punchcard';
import { string, integer, Record, Minimum, optional, array, boolean, nothing, Maximum, number } from '@punchcard/shape';

/**
 * Create a new Punchcard Application.
 */
export const app = new Core.App();

/**
 * Create a CloudFormation stack with the AWS CDK.
 */
const stack = app.stack('hello-world');

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
  gameTitle: string,
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
}) {}

namespace UserGameScore {
  export class Key extends UserGameScore.Pick(['userId', 'gameTitle']) {}
}
/**
 * DynamoDB Table storing the User-Game statistics. 
 */
const UserScores = new DynamoDB.Table(stack, 'ScoreStore', {
  data: UserGameScore,
  key: {
    partition: 'userId',
    sort: 'gameTitle'
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
   * Title of the game played.
   */
  gameTitle: string,
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

/**
 * Lambda Function to submit a game score for a user.
 */
const submitScore = new Lambda.Function(stack, 'SubmitScore', {
  /**
   * Accepts a `SubmitScoreRequest`.
   */
  request: SubmitScoreRequest,
  /**
   * Returns `nothing` (equiv. to `void`).
   */
  response: nothing,
  /**
   * Needs read and write access to update user game scores.
   */
  depends: UserScores.readWriteAccess()
}, async (request, highScores) => {
  const key = new UserGameScore.Key({
    userId: request.userId,
    gameTitle: request.gameTitle
  });
  await update();

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
            _.topScore.set(request.score > gameScore.topScore ? request.score : gameScore.topScore)
          ]
        });
      } catch (err) {
        if (err.code === 'ConditionCheckFailedException') {
          /**
           * Record was concurrently modified - start again.
           */
          await update();
        }
      }
    } else {
      try {
        /**
         * No record exists, so put the initial value.
         */
        await highScores.put(new UserGameScore({
          gameTitle: request.gameTitle,
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
 * Global Secondary Index to lookup a game title's high scores.
 */
const HighScores = UserScores.globalIndex({
  indexName: 'high-scores',
  key: {
    partition: 'gameTitle',
    sort: 'topScore'
  }
});

/**
 * Helper class for creating and passing around keys of the High Score Index.
 */
class HighScoresKey extends UserGameScore.Pick(['gameTitle', 'topScore']) {}

/**
 * A request for a game's high scores.
 */
class GetHighScoresRequest extends Record({
  /**
   * Title of game to query for high scores.
   */
  gameTitle: string,
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

/**
 * Lambda Function to get High Scores for a given game.
 */
const getHighScores = new Lambda.Function(stack, 'GetTopN', {
  /**
   * Accepts a `GetHighScoresRequest`.
   */
  request: GetHighScoresRequest,
  /**
   * Returns an array of `UserGameScore` objects.
   */
  response: array(UserGameScore),
  /**
   * We need reac access to the HighScores index to lookup results.
   */
  depends: HighScores.readAccess(),
}, async (request, highScores) => {
  const maxResults = request.maxResults === undefined ? 100 : request.maxResults;
  
  return await query([]);
  
  async function query(scores: UserGameScore[], LastEvaluatedKey?: HighScoresKey): Promise<UserGameScore[]> {
    const numberToFetch = Math.min(maxResults - scores.length, 100);
    const nextScores = await highScores.query({
      gameTitle: request.gameTitle,
      topScore: _ => _.greaterThan(0)
    }, {
      Limit: numberToFetch,
      ExclusiveStartKey: LastEvaluatedKey
    });

    scores = scores.concat(nextScores.Items!);

    if (!nextScores.LastEvaluatedKey || scores.length >= maxResults) {
      return scores;
    }

    return await query(scores, nextScores.LastEvaluatedKey);
  }
});
