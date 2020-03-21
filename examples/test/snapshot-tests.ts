import * as cdk from "@aws-cdk/core";
import {Build} from "punchcard/lib/core/build";
import {app as dataLakeApp} from "../src/data-lake";
import {app as dynamoDBApp} from "../src/dynamodb";
import {app as gameScoreServiceApp} from "../src/game-score-service";
import {app as helloWorldApp} from "../src/hello-world";
import {app as invokeFunctionApp} from "../src/invoke-function";
import {app as petStoreAPIGatewayApp} from "../src/pet-store-apigw";
import {app as scheduledFunctionApp} from "../src/scheduled-function";
import {app as streamProcessing} from "../src/stream-processing";

const apps = [
  {app: dataLakeApp, name: "data lake"},
  {app: dynamoDBApp, name: "data lake"},
  {app: gameScoreServiceApp, name: "data lake"},
  {app: helloWorldApp, name: "data lake"},
  {app: invokeFunctionApp, name: "data lake"},
  {app: petStoreAPIGatewayApp, name: "data lake"},
  {app: scheduledFunctionApp, name: "data lake"},
  {app: streamProcessing, name: "data lake"},
];

for (const app of apps) {
  // eslint-disable-next-line jest/valid-title
  describe(app.name, () => {
    for (const stack of Build.resolve(app.app.root).node.children) {
      if (cdk.Stack.isStack(stack)) {
        it(`stack ${app} should match snapshot`, () => {
          expect.assertions(1);
          // todo: find better soluton than casting to any
          expect((stack as any)._toCloudFormation()).toMatchInlineSnapshot();
        });
      }
    }
  });
}
