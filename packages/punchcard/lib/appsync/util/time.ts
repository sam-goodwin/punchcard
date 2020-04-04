import { VTL } from '../vtl';
import { VInteger, VString, VTimestamp } from '../vtl-object';

export class TimeUtil {
  public nowISO8601(): VTL<VTimestamp> {
    throw new Error('not implemented');
  }
  public nowEpochSeconds() : VTL<VInteger> {
    throw new Error('not implemented');
  }
  public nowEpochMilliSeconds() : VTL<VInteger> {
    throw new Error('not implemented');
  }
  public nowFormatted(format: VString) : VTL<VTimestamp> {
    throw new Error('not implemented');
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