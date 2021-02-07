import { timestamp } from '@punchcard/shape';

/**
 * JSON doesn’t have a date data type, so dates in Elasticsearch can either be:
 * - strings containing formatted dates, e.g. `"2015-01-01"` or `"2015/01/01 12:10:30"`.
 * - a long number representing milliseconds-since-the-epoch
 * - an integer representing seconds-since-the-epoch.
 *
 * Internally, dates are converted to UTC (if the time-zone is specified) and stored as a long number representing milliseconds-since-the-epoch.
 *
 * Queries on dates are internally converted to range queries on this long representation, and the result of aggregations and stored fields is converted back to a string depending on the date format that is associated with the field.
 *
 * Dates will always be rendered as strings, even if they were initially supplied as a long in the JSON document.
 *
 * Date formats can be customised, but if no format is specified then it uses the default: `strict_date_optional_time||epoch_millis"`
 *
 * This means that it will accept dates with optional timestamps, which conform to the formats supported by strict_date_optional_time or milliseconds-since-the-epoch.
 *
 * @see https://www.elastic.co/guide/en/elasticsearch/reference/current/date.html
 */
export function date<P extends DateProps>(esMappings: P) {
  return timestamp.apply({
    esMappings
  } as const);
}

export interface DateProps {
  /**
   * Mapping field-level query time boosting. Accepts a floating point number, defaults to 1.0.
   *
   * @default 1.0
   */
  boost?: number;
  /**
   * Should the field be stored on disk in a column-stride fashion, so that it can later be used for sorting, aggregations, or scripting? Accepts true (default) or false.
   *
   * @default true
   */
  doc_values?: boolean;
  /**
   * The date format(s) that can be parsed. Defaults to `strict_date_optional_time||epoch_millis`.
   */
  format?: string;
  /**
   * The locale to use when parsing dates since months do not have the same names and/or abbreviations in all languages. The default is the ROOT locale,
   */
  locale?: string;
  /**
   * If true, malformed numbers are ignored. If false (default), malformed numbers throw an exception and reject the whole document.
   *
   * @default false
   */
  ignore_malformed?: boolean;
  /**
   * Should the field be searchable? Accepts true (default) and false.
   *
   * @default true
   */
  index?: boolean;
  /**
   * Accepts a date value in one of the configured format's as the field which is substituted for any explicit null values. Defaults to null, which means the field is treated as missing.
   *
   * @default null
   */
  null_value?: string;
  /**
   * Whether the field value should be stored and retrievable separately from the _source field. Accepts true or false (default).
   *
   * @default false
   */
  store?: boolean;
  /**
   * Metadata about the field.
   */
  meta?: Record<string, string>;
}