import 'jest';

const apps = [
  'data-lake',
  'invoke-function',
  'pet-store-apigw',
  'scheduled-function',
  'stream-processing'
];

for (const app of apps) {
  describe(app, () => {
    for (const stack of require(`../lib/${app}`).default.node.children) {
      it(`stack ${app} should match snapshot`, () => {
        expect(stack._toCloudFormation()).toMatchSnapshot();
      });
    }
  });
}

