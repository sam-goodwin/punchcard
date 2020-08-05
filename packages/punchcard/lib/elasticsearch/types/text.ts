import { string } from '@punchcard/shape';

export function text<P extends TextProps>(esMappings: P) {
  return string.apply({
    esMappings
  } as const);
}

export interface TextProps {
  /**
   * The analyzer which should be used for the text field, both at index-time and at search-time (unless overridden by the search_analyzer). Defaults to the default index analyzer, or the standard analyzer.
   */
  analyzer?: any;
  /**
   * Mapping field-level query time boosting. Accepts a floating point number, defaults to 1.0.
   *
   * @default 1.0
   */
  boost?: number;
  /**
   * Should global ordinals be loaded eagerly on refresh? Accepts true or false (default). Enabling this is a good idea on fields that are frequently used for (significant) terms aggregations.
   *
   * @default true
   */
  eager_global_ordinals?: boolean;
  /**
   * Can the field use in-memory fielddata for sorting, aggregations, or scripting? Accepts true or false (default).
   *
   * @default true
   */
  fielddata?: boolean;
  /**
   * Expert settings which allow to decide which values to load in memory when fielddata is enabled. By default all values are loaded.
   */
  fielddata_frequency_filter?: {
    min: number;
    max: number;
    min_segment_size: number;
  };
  /**
   * Multi-fields allow the same string value to be indexed in multiple ways for different purposes, such as one field for search and a multi-field for sorting and aggregations, or the same string value analyzed by different analyzers.
   */
  fields?: Record<string, TextProps>;
  /**
   * Should the field be searchable? Accepts true (default) or false.
   *
   * @default true
   */
  index?: boolean;
  /**
   * What information should be stored in the index, for search and highlighting purposes. Defaults to positions.
   *
   * @default positions
   */
  index_options?: IndexOptionType
  /**
   * If enabled, term prefixes of between 2 and 5 characters are indexed into a separate field. This allows prefix searches to run more efficiently, at the expense of a larger index.
   *
   * @default false
   */
  index_prefixes?: boolean;
  /**
   * If enabled, two-term word combinations (shingles) are indexed into a separate field. This allows exact phrase queries (no slop) to run more efficiently, at the expense of a larger index. Note that this works best when stopwords are not removed, as phrases containing stopwords will not use the subsidiary field and will fall back to a standard phrase query. Accepts true or false (default).
   *
   * @default false
   */
  index_phrases?: boolean;
  /**
   * Whether field-length should be taken into account when scoring queries. Accepts true (default) or false.
   *
   * @default true
   */
  norms?: boolean;
  /**
   * The number of fake term position which should be inserted between each element of an array of strings. Defaults to the position_increment_gap configured on the analyzer which defaults to 100. 100 was chosen because it prevents phrase queries with reasonably large slops (less than 100) from matching terms across field values.
   */
  position_increment_gap?: number;
  /**
   * Whether the field value should be stored and retrievable separately from the _source field. Accepts true or false (default).
   *
   * @default false
   */
  store?: boolean;
  /**
   * The analyzer that should be used at search time on the text field. Defaults to the analyzer setting.
   */
  search_analyzer?: string;
  /**
   * The analyzer that should be used at search time when a phrase is encountered. Defaults to the search_analyzer setting.
   */
  search_quote_analyzer: string;
  /**
   * Which scoring algorithm or similarity should be used. Defaults to BM25.
   *
   * @default BM25
   */
  similarity?: SimilarityType;
  /**
   * Whether term vectors should be stored for the field. Defaults to no.
   */
  term_vector?: TermVector;
  /**
   * Metadata about the field.
   */
  meta?: Record<string, string>;
}

/**
 * Term vectors contain information about the terms produced by the analysis process, including:
 * - a list of terms.
 * - the position (or order) of each term.
 * - the start and end character offsets mapping the term to its origin in the original string.
 * - payloads (if they are available) — user-defined binary data associated with each term position.
 *
 * These term vectors can be stored so that they can be retrieved for a particular document.
 */
export enum TermVector {
  /**
   * No term vectors are stored. (default)
   */
  no = 'no',
  /**
   * Just the terms in the field are stored.
   */
  yes = 'yes',
  /**
   * Terms and positions are stored.
   */
  with_positions = 'with_positions',
  /**
   * Terms and character offsets are stored.
   */
  with_offsets = 'with_offsets',
  /**
   * Terms, positions, and character offsets are stored.
   */
  with_positions_offsets = 'with_positions_offsets',
  /**
   * Terms, positions, and payloads are stored.
   */
  with_positions_payloads = 'with_positions_payloads',
  /**
   * Terms, positions, offsets and payloads are stored.
   */
  with_positions_offsets_payloads = 'with_positions_offsets_payloads',
}

export enum IndexOptionType {
  /**
   * Only the doc number is indexed. Can answer the question Does this term exist in this field?
   */
  docs = 'docs',
  /**
   * Doc number and term frequencies are indexed. Term frequencies are used to score repeated terms higher than single terms.
   */
  freqs = 'freqs',
  /**
   * Doc number, term frequencies, and term positions (or order) are indexed. Positions can be used for proximity or phrase queries.
   */
  positions = 'positions',
  /**
   * Doc number, term frequencies, positions, and start and end character offsets (which map the term back to the original string) are indexed. Offsets are used by the unified highlighter to speed up highlighting.
   */
  offsets = 'offsets',
}

/**
 * Elasticsearch allows you to configure a scoring algorithm or similarity per field. The similarity setting provides a simple way of choosing a similarity algorithm other than the default BM25, such as TF/IDF.
 *
 * Similarities are mostly useful for text fields, but can also apply to other field types.
 *
 * Custom similarities can be configured by tuning the parameters of the built-in similarities. For more details about this expert options, see the similarity module.
 *
 * @see https://www.elastic.co/guide/en/elasticsearch/reference/current/similarity.html
 */
export enum SimilarityType {
  BM25 = 'BM25',
  boolean = 'boolean',
  classic = 'classic',
}