import 'jest';

import fs = require('fs');
import path = require('path');

const apps = fs.readdirSync(path.join(__dirname, '../lib/'))
  .filter(f => f.endsWith('.ts'))
  .map(f => path.basename(f, '.ts'));

for (const app of apps) {
  describe(app, () => {
    for (const stack of require(`../lib/${app}`).default.node.children) {
      it(`stack ${app} should match snapshot`, () => {
        expect(stack._toCloudFormation()).toMatchSnapshot();
      });
    }
  });
}

