import { BoolShape, IntegerShape, NumberShape, StringShape, TimestampShape } from '@punchcard/shape';
import { StandardClaims } from './standard-claims';

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
  [name: string]: AttributeShape;
}

export type RequiredAttributes = {
  [k in keyof StandardClaims]?: boolean;
}
