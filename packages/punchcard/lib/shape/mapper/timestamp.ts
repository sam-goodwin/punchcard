import moment = require('moment');
import { Mapper } from './mapper';

export interface TimestampFormat extends Mapper<Date, string> {}
export namespace TimestampFormat {
  export const ISO8601 = {
    write(date: Date) {
      return date.toISOString();
    },
    read(date: string) {
      return new Date(Date.parse(date));
    }
  };
// tslint:disable-next-line: variable-name
  export const AwsGlue = {
    write(value: Date) {
      // TODO: why the f doesn't athena support ISO8601 string lol
      return moment(value).format('YYYY-MM-DD HH:mm:ss.SSS');

      // return `${date} ${time}`
    },
    read(value: string) {
      return moment(value).toDate();
    }
  };
}