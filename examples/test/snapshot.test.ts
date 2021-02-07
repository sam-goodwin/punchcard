import 'jest';

// tslint:disable-next-line: punchcard-transient-imports
import cdk = require('@aws-cdk/core');
import fs = require('fs');
import path = require('path');
import { Build } from 'punchcard/lib/core/build';
import { Global } from 'punchcard/lib/core';

const apps = fs.readdirSync(path.join(__dirname, '../src/'))
  .filter(f => f.endsWith('.ts'))
  .map(f => path.basename(f, '.ts'));

for (const app of apps) {
  describe(app, () => {
    Global.clear();
    const a = require(`../lib/${app}`).app.root as Build<cdk.App>;
    Build.walkAll();
    for (const stack of Build.resolve(a).node.children) {
      if (cdk.Stack.isStack(stack)) {
        it(`stack ${app} should match snapshot`, () => {
          expect((stack as any)._toCloudFormation()).toMatchSnapshot();
        });
      }
    }
  });
}
