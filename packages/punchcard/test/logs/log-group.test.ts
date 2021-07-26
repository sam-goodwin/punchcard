import 'jest';
import sinon = require('sinon');

import core = require('@aws-cdk/core');
import { StringShape, map, string } from '@punchcard/shape';
import { Core, Lambda, Logs, Util } from '../../lib';
import { Build } from '../../lib/core/build';
import { Dependency } from '../../lib/core/dependency';
import { Run } from '../../lib/core/run';

Util.setRuntime();

const eventObj = {};
const payload = new Logs.Event.Payload({
  awslogs: {
    data: 'H4sIAAAAAAAAAG1Qy27CMBD8F5+JhL2xveYWlBgVQakaDhUVqkxwaSTyaOL0IcS/dyntjctKOzszmp0Tq3zfu4Nff7eeTViarJOXZZbnySxjI9Z81r4jGA0K4FpKrmOCj81h1jVDS5eHoS7eCtfto8UfmBoNUioTJdCul1+P79rIzVWUh8676rbKv7rhGK6MMSQxWOBRemdBWour5H5OFv2w64uubEPZ1LY8Bt/1bPJ8w23hqt3eWWHUlGcqyuJV/iTT+XRup2z7GyX78HW4qE+s3FMiUAIpuOBgELlUiGMhBKJRsaZN0QBN73OllAE04xg4oFSUKpTUYXAV1cGV0AI1Xig4+u+W7E9ndt6efwDigCL/bgEAAA==',
  },
});

describe('run', () => {
  it('should parse payload into events', async () => {
    const stack = Build.of(new core.Stack(new core.App( { autoSynth: false } ), 'stack'));
    const logGroup = new Logs.LogGroup(stack, 'Log Group', {
      shape: map(string),
    });

    const results: { [key: string]: string }[] = [];
    await (logGroup.events().forEach(stack, 'id', {}, async (v) => {
      results.push(v);
      return Promise.resolve(v);
    }).handle(payload, [{}], {}));

    expect(results).toEqual([eventObj]);
  });
});
