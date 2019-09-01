import { Shape } from "../shape/shape";
import { StructShape } from "../shape/struct";

/**
 * Glue partition shape must be of only string, date or numeric types.
 */
export type Partition = StructShape<{
  [key: string]: Shape<string> | Shape<number> | Shape<Date> | Shape<boolean>;
}>;