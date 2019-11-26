import cdk = require('@aws-cdk/core');

import { Build } from './build';
import { Code } from './code';

export class App {
  public readonly root: Build<cdk.App>;

  constructor() {
    this.root = Build.lazy(() => new cdk.App({
      autoSynth: false
    }));
    if (process.env.is_runtime !== 'true') {
      process.once('beforeExit', () => {
        // resolve the reference to the root - only the root App is resolved at this time.
        const app = Build.resolve(this.root);
        // code compilation is an asynchronous process so we initialize it here
        // before entering the Build domain containing Constructs.
        Code.initCode(app, () => {
          // resolve all nodes in the Build domain
          Build.walk(this.root);
          // synth the fully-constructed Construct tree.
          app.synth();
        });
      });
    }
  }
}
