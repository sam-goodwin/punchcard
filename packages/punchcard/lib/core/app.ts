import type * as cdk from '@aws-cdk/core';

import { isRuntime } from '../util/constants';
import { Build } from './build';
import { CDK } from './cdk';
import { Code } from './code';

export class App {
  public readonly root: Build<cdk.App>;
  public readonly externals: Set<string> = new Set();
  public readonly plugins: any[] = [];

  constructor() {
    this.root = Build.lazy(() => new CDK.Core.App({
      autoSynth: false
    }));
    if (!isRuntime()) {
      const webpack = require('webpack') as typeof import('webpack');

      this.addExternal('aws-sdk');
      this.addExternal('webpack');
      this.addPlugin(new webpack.IgnorePlugin({
        resourceRegExp: /^(webpack|@aws-cdk.*|@punchcard\/constructs)$/
      }));

      process.once('beforeExit', () => {
        // resolve the reference to the root - only the root App is resolved at this time.
        const app = Build.resolve(this.root);
        // code compilation is an asynchronous process so we initialize it here
        // before entering the Build domain containing Constructs.
        Code.initCode(app, Array.from(this.externals), this.plugins).then(() => {
          // resolve all nodes in the Build domain
          Build.walkAll();
          // Build.walk(this.root);
          // synth the fully-constructed Construct tree.
          app.synth();
        });
      });
    }
  }

  public stack(id: string): Build<cdk.Stack> {
    return this.root.map(app => new CDK.Core.Stack(app, id));
  }

  public addExternal(external: string): void {
    this.externals.add(external);
  }

  public removeExternal(external: string): void {
    this.externals.delete(external);
  }

  public addPlugin(plugin: any): void {
    this.plugins.push(plugin);
  }
}
