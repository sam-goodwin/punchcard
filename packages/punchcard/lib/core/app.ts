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
        // resolve all Build closures and synth the app if this isn't runtime.
        const app = Build.resolve(this.root);
        Code.initCode(app, () => {
          Build.walk(this.root);
          app.synth();
        });
      });
    }
  }
}
