import 'jest';

import { number, string } from '@punchcard/shape';
import { Table } from '../lib/client';

// tslint:disable: member-access
class Type {
  key = string;
  count = number;
}

const table = new Table(Type, ['key', 'count'], {
  tableArn: 'my-table-arn'
});

// leaving this here as a compile time test for now
async function testDDB() {
  const a = await table.get(['a', 1]);

  await table.put({
    key: 'key',
    count: 1
  });

  await table.putIf({
    key: 'key',
    count: 1
  }, _ => _.count.equals(1));

  await table.query(['key', _ => _.greaterThan(1)]);
}

test('todo', async () => {
  // TODO
});
