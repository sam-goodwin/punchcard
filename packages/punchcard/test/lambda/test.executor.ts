import core = require('@aws-cdk/core');
import 'jest';

import { Lambda } from '../../lib';
import { Build } from '../../lib/core/build';

import assert = require('@aws-cdk/assert');
import { Schedule } from '@aws-cdk/aws-events';

it('should support default properties', async () => {
  const executorService = new Lambda.ExecutorService({
    memorySize: 512,
    timeout: core.Duration.seconds(15)
  });

  const stack = Build.of(new core.Stack(new core.App( { autoSynth: false } ), 'stack'));

  const f = executorService.spawn(stack, 'f', {}, async () => "");
  expect(Build.resolve(f.resource));
  assert.expect(Build.resolve(stack)).to(assert.haveResourceLike('AWS::Lambda::Function', {
    Timeout: 15,
    MemorySize: 512
  }));
});

it('schedule should support default properties', async () => {
  const executorService = new Lambda.ExecutorService({
    memorySize: 512,
    timeout: core.Duration.seconds(15)
  });

  const stack = Build.of(new core.Stack(new core.App( { autoSynth: false } ), 'stack'));

  const f = executorService.schedule(stack, 'f', {
    schedule: Schedule.rate(core.Duration.minutes(1))
  }, async () => "");

  expect(Build.resolve(f.resource));

  assert.expect(Build.resolve(stack)).to(assert.haveResourceLike('AWS::Lambda::Function', {
    Timeout: 15,
    MemorySize: 512
  }));
});