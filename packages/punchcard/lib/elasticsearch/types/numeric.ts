import { number } from "@punchcard/shape";

export function numeric<T extends ScaledNumberProps | NumberProps>(esMappings: T) {
  return number.apply({
    esMappings
  } as const);
}

export interface ScaledNumberProps extends BaseNumberProps {
  type: 'scaled_float';

  /**
   * The scaling factor to use when encoding values. Values will be multiplied by this factor at index time and rounded to the closest long value. For instance, a scaled_float with a scaling_factor of 10 would internally store 2.34 as 23 and all search-time operations (queries, aggregations, sorting) will behave as if the document had a value of 2.3. High values of scaling_factor improve accuracy but also increase space requirements. This parameter is required.
   */
  scaling_factor: number;
}

export interface NumberProps extends BaseNumberProps {
  type:
    | 'long'
    | 'short'
    | 'byte'
    | 'double'
    | 'float'
    | 'half_float'
}

export interface BaseNumberProps {
  /**
   * Try to convert strings to numbers and truncate fractions for integers. Accepts true (default) and false.
   *
   * @default true
   */
  coerce?: boolean;
  /**
   * Mapping field-level query time boosting. Accepts a floating point number, defaults to 1.0.
   *
   * @default 1.0
   */
  boost: number;
  /**
   * Should the field be stored on disk in a column-stride fashion, so that it can later be used for sorting, aggregations, or scripting? Accepts true (default) or false.
   *
   * @default true
   */
  doc_values?: boolean;
  /**
   * If true, malformed numbers are ignored. If false (default), malformed numbers txception and reject the whole document.
   */
  ignore_malformed?: boolean;
  /**
   * Should the field be searchable? Accepts true (default) and false.
   *
   * @default true
   */
  index?: boolean;
  /**
   * Accepts a numeric value of the same type as the field which is substituted for any explicit null values. Defaults to null, which means the field is treated as missing.
   *
   * @default null
   */
  null_value?: number;
  /**
   * Whether the field value should be stored and retrievable separately from the _source field. Accepts true or false (default).
   *
   * @default true
   */
  store: boolean;
  /**
   * Metadata about the field.
   *
   * Field metadata enforces at most 5 entries, that keys have a length that is less than or equal to 20, and that values are strings whose length is less than or equal to 50.
   */
  meta: Record<string, string>;
}