import { BoolShape, IntegerShape, NumberShape, StringShape, TimestampShape } from '@punchcard/shape';

/**
 * Valid shapes that represent Attributes
 */
export type AttributeShape =
  | StringShape
  | TimestampShape
  | BoolShape
  | IntegerShape
  | NumberShape
  ;

export interface CustomAttributes {
  [name: string]: AttributeShape
}