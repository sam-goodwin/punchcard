import { VInteger, VString, VTimestamp, VTL } from '../types';

export class TimeUtil {

  public nowISO8601(): VTL<VTimestamp> {
    yield 
  }
  public nowEpochSeconds() : VTL<VInteger> {

  }
  public nowEpochMilliSeconds() : VTL<VInteger> {

  }
  public nowFormatted(format: VString) : VTL<VTimestamp> {

  }
  // public parseFormattedToEpochMilliSeconds(VString, VString) : VTL<VInteger> {

  // }
  // public parseFormattedToEpochMilliSeconds(VString, VString, VString) : VTL<VInteger> {

  // }
  public parseISO8601ToEpochMilliSeconds(s: VTL<VString>) : VTL<VInteger> {

  }
  public epochMilliSecondsToSeconds(VInteger) : VTL<VInteger> {

  }
  public epochMilliSecondsToISO8601(VInteger) : VTL<VString> {

  }
  public epochMilliSecondsToFormatted(VInteger, VString) : VTL<VString> {

  }
  public epochMilliSecondsToFormatted(VInteger, VString, VString) : VTL<VString> {

  }
}