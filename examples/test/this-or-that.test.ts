import 'jest'

// tslint:disable-next-line: punchcard-transient-imports
import cdk = require('@aws-cdk/core');

import { app } from '../lib/this-or-that';
import { Build } from 'punchcard/lib/core/build';

test('app synths', () => {
  Build.walkAll();
  for (const stack of Build.resolve(app.root).node.children) {
    if (cdk.Stack.isStack(stack)) {
      it(`stack ${app} should match snapshot`, () => {
        expect((stack as any)._toCloudFormation()).toMatchSnapshot();
      });
    }
  }
});
