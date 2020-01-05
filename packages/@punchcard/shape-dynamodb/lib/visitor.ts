import { AttributeValue } from './attribute';

export interface Visitor<T = unknown> {
  B: (value: AttributeValue.Binary) => T;
  BS: (value: AttributeValue.BinarySet) => T;
  BOOL: (value: AttributeValue.Bool) => T;
  S: (value: AttributeValue.StringValue) => T;
  SS: (value: AttributeValue.StringSet) => T;
  N: (value: AttributeValue.NumberValue) => T;
  NS: (value: AttributeValue.NumberSet) => T;
  L: (value: AttributeValue.List<any>) => T;
  M: (value: AttributeValue.Map<any>) => T;
}