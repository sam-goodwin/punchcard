import cdk = require('@aws-cdk/cdk');
import { AMAZON } from './built-in';
import { Intent, Skill, Slot } from './skill';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'alexa-skill');

// tslint:disable: variable-name
const MyIntent = new Intent({
  name: 'MyIntent',
  slots: {
    mySlot: new Slot({
      type: AMAZON.Anaphor,
      samples: () => [
        'sample utterances'
      ]
    }),
    dateSlot: new Slot({
      type: AMAZON.DATE
    })
  },
  samples: (locale) => [
    `hello {mySlot}`,
    `the date is {dateSlot}`
  ]
});

const skill = new Skill(stack, 'MySkill', {
  vendorId: 'my-vendor-id',
  name: 'MySkill',
  locales: [
    'en-US'
  ],
  intents: [
    AMAZON.HelpIntent,
    MyIntent
  ]
});
