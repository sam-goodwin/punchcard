import { string, timestamp } from '@punchcard/shape';
import { VExpression } from '../expression';
import { setVariable } from '../statement';
import { VTL } from '../vtl';
import { VInteger, VObject, VString, VTimestamp } from '../vtl-object';

export class TimeUtil {
  public *nowISO8601(): VTL<VTimestamp> {
    return yield* setVariable(new VTimestamp(new VExpression('$util.time.nowISO8601()')));
  }
  public *nowEpochSeconds() : VTL<VInteger> {
    return yield* setVariable(new VInteger(new VExpression('$util.time.nowISO8601()')));
  }
  public *nowEpochMilliSeconds() : VTL<VInteger> {
    return yield* setVariable(new VInteger(new VExpression('$util.time.nowEpochMilliSeconds()')));
  }
  public *nowFormatted(format: VString) : VTL<VString> {
    return yield* setVariable(new VString(VExpression.concat(
      VExpression.text('$util.time.nowFormatted('),
      format,
      VExpression.text(')')
    )));
  }
  // public parseFormattedToEpochMilliSeconds(VString, VString) : VTL<VInteger> {

  // }
  // public parseFormattedToEpochMilliSeconds(VString, VString, VString) : VTL<VInteger> {

  // }
  public parseISO8601ToEpochMilliSeconds(s: VTL<VString>) : VTL<VInteger> {
    throw new Error('not implemented');
  }
  // public epochMilliSecondsToSeconds(VInteger) : VTL<VInteger> {
  //   throw new Error('not implemented');
  // }
  // public epochMilliSecondsToISO8601(VInteger) : VTL<VString> {
  //   throw new Error('not implemented');
  // }
  // public epochMilliSecondsToFormatted(VInteger, VString) : VTL<VString> {
  //   throw new Error('not implemented');
  // }
  // public epochMilliSecondsToFormatted(VInteger, VString, VString) : VTL<VString> {
  //   throw new Error('not implemented');
  // }
}