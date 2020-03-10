import { Record, Shape, timestamp } from '@punchcard/shape';

import Glue = require('../lib');

class Data extends Record({
  timestamp
}) {}

const mapper = Glue.DataType.Json.mapper(Shape.of(Data));
test('timestamp format should be compatible with Hive', () => {
  timestampTest(new Date(0), '1970-01-01 00:00:00.000');
  timestampTest(new Date(1583451875123), '2020-03-05 23:44:35.123');
});

function timestampTest(date: Date, expected: string) {
  const json = JSON.parse(mapper.write(new Data({
    timestamp: date
  })).toString('utf8'));

  expect(json).toEqual({
    timestamp: expected
  });
}