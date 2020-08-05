import erasure = require('@punchcard/erasure');

import { isRuntime } from '../util/constants';
import { Build } from './build';
import { CDK } from './cdk';
import { Code } from './code';

import type * as cdk from '@aws-cdk/core';
import type * as webpack from 'webpack';

/**
 * Erase webpack and the CDK from the runtime bundle./
 */
erasure.erasePattern(/^(webpack|@aws-cdk.*)$/);

/**
 * Global Webpack Build context. Lazily requires webpack only at Build-time
 * so that developers can tune the webpack configuration of bundling without
 */
export const Webpack: Build<typeof import('webpack')> = Build.lazy(() => require('webpack')) as any;

export class App {
  /**
   * Root of the application contained within a Build context.
   */
  public readonly root: Build<cdk.App>;
  public readonly externals: Set<string> = new Set();
  public readonly plugins: Build<webpack.Plugin>[] = [];

  constructor() {
    this.root = CDK.map(({core}) => new core.App({
      autoSynth: false
    }));
    if (!isRuntime()) {
      this.addExternal('aws-sdk');

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
    return CDK.chain(({core}) => this.root.map(a => new core.Stack(a, id)));
  }

  public addExternal(external: string): void {
    this.externals.add(external);
  }

  public removeExternal(external: string): void {
    this.externals.delete(external);
  }
}
