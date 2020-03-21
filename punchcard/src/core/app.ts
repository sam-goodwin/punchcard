import * as cdk from "@aws-cdk/core";
import * as webpack from "webpack";
import {Build} from "./build";
import {CDK} from "./cdk";
import {Code} from "./code";
import {erasePattern} from "@punchcard/erasure";
import {isRuntime} from "../util/constants";

/**
 * Erase webpack and the CDK from the runtime bundle./
 */
erasePattern(/^(webpack|@aws-cdk.*)$/);

/**
 * Global Webpack Build context. Lazily requires webpack only at Build-time
 * so that developers can tune the webpack configuration of bundling without
 */
export const Webpack: Build<typeof import("webpack")> = Build.lazy(() =>
  require("webpack"),
) as any;

export class App {
  /**
   * Root of the application contained within a Build context.
   */
  public readonly root: Build<cdk.App>;
  public readonly externals: Set<string> = new Set();
  public readonly plugins: Build<webpack.Plugin>[] = [];

  constructor() {
    this.root = CDK.map(
      ({core}) =>
        new core.App({
          autoSynth: false,
        }),
    );
    if (!isRuntime()) {
      this.addExternal("aws-sdk");

      process.once("beforeExit", () => {
        // resolve the reference to the root - only the root App is resolved at this time.
        const app = Build.resolve(this.root);
        (async (): Promise<void> => {
          // code compilation is an asynchronous process so we initialize it here
          // before entering the Build domain containing Constructs.
          await Code.initCode(app, [...this.externals], this.plugins);
          // resolve all nodes in the Build domain
          Build.walkAll();
          // Build.walk(this.root);
          // synth the fully-constructed Construct tree.
          app.synth();
        })();
      });
    }
  }

  public stack(id: string): Build<cdk.Stack> {
    return CDK.chain(({core}) =>
      this.root.map((app) => new core.Stack(app, id)),
    );
  }

  public addExternal(external: string): void {
    this.externals.add(external);
  }

  public removeExternal(external: string): void {
    this.externals.delete(external);
  }
}
