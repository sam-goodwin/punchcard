import {Core, DynamoDB, Lambda} from "punchcard";
import {
  Maximum,
  Minimum,
  Record,
  array,
  boolean,
  integer,
  nothing,
  optional,
  string,
} from "@punchcard/shape";

/**
 * Create a new Punchcard Application.
 */
export const app = new Core.App();

/**
 * Create a CloudFormation stack with the AWS CDK.
 */
const stack = app.stack("game-score-service");

/**
 * Record of data to maintain a user's statistics for a game.
 */
class UserGameScore extends Record({
  /**
   * User ID
   */
  gameTitle: string,
  /**
   * Title of the game played.
   */
  losses: integer.apply(Minimum(0)),
  /**
   * Top score achieved on this game.
   * Minimum: 0
   */
  topScore: integer.apply(Minimum(0)),
  /**
   * Number of times the player won the game.
   */
  userId: string,
  /**
   * Numer of times the player lost the game.
   */
  version: integer,
  /**
   * Version of the DynamoDB record - use for optimistic locking.
   */
  wins: integer.apply(Minimum(0)),
}) {}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace UserGameScore {
  export class Key extends UserGameScore.Pick(["userId", "gameTitle"]) {}
}
/**
 * DynamoDB Table storing the User-Game statistics.
 */
const UserScores = new DynamoDB.Table(stack, "ScoreStore", {
  data: UserGameScore,
  key: {
    partition: "userId",
    sort: "gameTitle",
  },
});

/**
 * A request to submit a new game score for a user.
 */
class SubmitScoreRequest extends Record({
  /**
   * User ID
   */
  gameTitle: string,
  /**
   * Title of the game played.
   */
  score: integer.apply(Minimum(0)),
  /**
   * Did the player win or lose?
   */
  userId: string,
  /**
   * Game score achieved.
   * Minimum: 0
   */
  victory: boolean,
}) {}

/**
 * Lambda Function to submit a game score for a user.
 */
// @ts-ignore
const submitScore = new Lambda.Function(
  stack,
  "SubmitScore",
  {
    /**
     * Accepts a `SubmitScoreRequest`.
     */
    depends: UserScores.readWriteAccess(),
    /**
     * Returns `nothing` (equiv. to `void`).
     */
    request: SubmitScoreRequest,
    /**
     * Needs read and write access to update user game scores.
     */
    response: nothing,
  },
  async (request, highScores) => {
    const key = new UserGameScore.Key({
      gameTitle: request.gameTitle,
      userId: request.userId,
    });
    await update();

    async function update(): Promise<void> {
      const gameScore = await highScores.get(key);
      console.log("got game score", gameScore);
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
            actions: (_) => [
              _.losses.increment(request.victory ? 0 : 1),
              _.wins.increment(request.victory ? 1 : 0),
              _.topScore.set(
                request.score > gameScore.topScore
                  ? request.score
                  : gameScore.topScore,
              ),
              _.version.increment(),
            ],
            /**
             * increment, wins, losses and record the top score
             */
            if: (_) => _.version.equals(gameScore.version),
          });
        } catch (error) {
          console.error(error);
          if (error.code === "ConditionCheckFailedException") {
            /**
             * Record was concurrently modified - start again.
             */
            await update();
          } else {
            throw error;
          }
        }
      } else {
        try {
          /**
           * No record exists, so put the initial value.
           */
          await highScores.put(
            new UserGameScore({
              gameTitle: request.gameTitle,
              losses: request.victory ? 0 : 1,
              topScore: request.score,
              userId: request.userId,
              version: 1,
              wins: request.victory ? 1 : 0,
            }),
            {
              /**
               * Don't overwrite if a score was submitted in-between our get request.
               */
              if: (_) => _.userId.notExists(),
            },
          );
        } catch (error) {
          if (error.code === "ConditionCheckFailedException") {
            /**
             * A record was put before we could submit our request, start again.
             */
            await update();
          } else {
            throw error;
          }
        }
      }
    }
  },
);

/**
 * Global Secondary Index to lookup a game title's high scores.
 */
const HighScores = UserScores.globalIndex({
  indexName: "high-scores",
  key: {
    partition: "gameTitle",
    sort: "topScore",
  },
});

/**
 * Helper class for creating and passing around keys of the High Score Index.
 */
class HighScoresKey extends UserGameScore.Pick(["gameTitle", "topScore"]) {}

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
   * @defaultValue 100
   */
  maxResults: optional(integer)
    .apply(Minimum(0))
    .apply(Maximum(1000)),
}) {}

/**
 * Lambda Function to get High Scores for a given game.
 */
// @ts-ignore
const getHighScores = new Lambda.Function(
  stack,
  "GetTopN",
  {
    /**
     * Accepts a `GetHighScoresRequest`.
     */
    depends: HighScores.readAccess(),
    /**
     * Returns an array of `UserGameScore` objects.
     */
    request: GetHighScoresRequest,
    /**
     * We need reac access to the HighScores index to lookup results.
     */
    response: array(UserGameScore),
  },
  async (request, highScores) => {
    const maxResults =
      request.maxResults === undefined ? 100 : request.maxResults;

    return await query([]);

    async function query(
      scores: UserGameScore[],
      LastEvaluatedKey?: HighScoresKey,
    ): Promise<UserGameScore[]> {
      const numberToFetch = Math.min(maxResults - scores.length, 100);
      const nextScores = await highScores.query(
        {
          // @ts-ignore
          gameTitle: request.gameTitle,
          // @ts-ignore
          topScore: (_) => _.greaterThan(0),
        },
        {
          ExclusiveStartKey: LastEvaluatedKey,
          Limit: numberToFetch,
          ScanIndexForward: false,
        },
      );

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      scores = scores.concat(nextScores.Items!);

      if (!nextScores.LastEvaluatedKey || scores.length >= maxResults) {
        return scores;
      }

      return await query(scores, nextScores.LastEvaluatedKey);
    }
  },
);
