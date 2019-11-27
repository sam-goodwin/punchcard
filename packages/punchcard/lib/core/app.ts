import cdk = require('@aws-cdk/core');

import { Build } from './build';
import { Code } from './code';

import webpack = require('webpack');

export class App {
  public readonly root: Build<cdk.App>;
  public readonly externals: Set<string> = new Set();
  public readonly plugins: webpack.Plugin[] = [];

  constructor() {
    this.addExternal('aws-sdk');
    this.addExternal('webpack');
    this.addPlugin(new webpack.IgnorePlugin({
      resourceRegExp: /^webpack$/ // don't generate imports for webpack
    }));

    this.root = Build.lazy(() => new cdk.App({
      autoSynth: false
    }));
    if (process.env.is_runtime !== 'true') {
      process.once('beforeExit', () => {
        // resolve the reference to the root - only the root App is resolved at this time.
        const app = Build.resolve(this.root);
        // code compilation is an asynchronous process so we initialize it here
        // before entering the Build domain containing Constructs.
        Code.initCode(app, Array.from(this.externals), this.plugins, () => {
          // resolve all nodes in the Build domain
          Build.walk(this.root);
          // synth the fully-constructed Construct tree.
          app.synth();
        });
      });
    }
  }

  public removeImports(resourceRegExp: RegExp): void{
    this.addPlugin(new webpack.IgnorePlugin({
      resourceRegExp
    }));
  }

  public addExternal(external: string): void {
    this.externals.add(external);
  }

  public removeExternal(external: string): void {
    this.externals.delete(external);
  }

  public addPlugin(plugin: webpack.Plugin): void {
    this.plugins.push(plugin);
  }
}
