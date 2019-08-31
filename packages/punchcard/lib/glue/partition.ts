import { Type } from "../shape/type";

/**
 * Glue partition shape must be of only string, date or numeric types.
 */
export type Partition = {
  [key: string]: Type<string> | Type<number> | Type<Date> | Type<boolean>;
};