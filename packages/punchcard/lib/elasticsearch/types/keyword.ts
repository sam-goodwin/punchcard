import { string } from '@punchcard/shape';

export function keyword<P extends KeywordProps>(props: P) {
  return string.apply(props);
}

/**
 * A field to index structured content such as IDs, email addresses, hostnames, status codes, zip codes or tags.
 *
 * They are typically used for filtering (Find me all blog posts where status is published), for sorting, and for aggregations. Keyword fields are only searchable by their exact value.
 *
 * If you need to index full text content such as email bodies or product descriptions, it is likely that you should rather use a text field.
 *
 * @see https://www.elastic.co/guide/en/elasticsearch/reference/current/keyword.html
 */
export interface KeywordProps {
  type: 'keyword';
  /**
   * Mapping field-level query time boosting. Accepts a floating point number, defaults to 1.0.
   *
   * @default 1.0
   */
  boost?: number;
  /**
   * Should the field be stored on disk in a column-stride fashion, so that it can later be used for sorting, aggregations, or scripting? Accepts true (default) or false.
   */
  doc_values?: any;
  /**
   * Should global ordinals be loaded eagerly on refresh? Accepts true or false (default). Enabling this is a good idea on fields that are frequently used for terms aggregations.
   */
  eager_global_ordinals?: any;
  /**
   * Multi-fields allow the same string value to be indexed in multiple ways for different purposes, such as one field for search and a multi-field for sorting and aggregations.
   */
  fields?: any;
  /**
   * Do not index any string longer than this value. Defaults to 2147483647 so that all values would be accepted. Please however note that default dynamic mapping rules create a sub keyword field that overrides this default by setting ignore_above: 256.
   */
  ignore_above?: any;
  /**
   * Should the field be searchable? Accepts true (default) or false.
   */
  index?: any;
  /**
   * What information should be stored in the index, for scoring purposes. Defaults to docs but can also be set to freqs to take term frequency into account when computing scores.
   */
  index_options?: any;
  /**
   * Whether field-length should be taken into account when scoring queries. Accepts true or false (default).
   */
  norms?: any;
  /**
   * Accepts a string value which is substituted for any explicit null values. Defaults to null, which means the field is treated as missing.
   */
  null_value?: any;
  /**
   * Whether the field value should be stored and retrievable separately from the _source field. Accepts true or false (default).
   */
  store?: any;
  /**
   * Which scoring algorithm or similarity should be used. Defaults to BM25.
   */
  similarity?: any;
  /**
   * How to pre-process the keyword prior to indexing. Defaults to null, meaning the keyword is kept as-is.
   */
  normalizer?: any;
  /**
   * Whether full text queries should split the input on whitespace when building a query for this field. Accepts true or false (default).
   */
  split_queries_on_whitespace?: any;
  /**
   * Metadata about the field.
   */
  meta?: Record<string, string>;
}