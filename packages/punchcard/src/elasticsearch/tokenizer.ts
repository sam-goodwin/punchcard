/**
 * @see https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis-tokenizers.html
 */
export enum Tokenizer {
  /**
   * The Standard tokenizer divides text into terms on word boundaries, as defined by the Unicode Text Segmentation algorithm. It removes most punctuation symbols. It is the best choice for most languages.
   */
  standard = 'standard',
  /**
   * The Letter tokenizer divides text into terms whenever it encounters a character which is not a letter.
   */
  letter = 'letter',
  /**
   * The Lowercase tokenizer, like the letter tokenizer, divides text into terms whenever it encounters a character which is not a letter, but it also lowercases all terms.
   */
  lowercase = 'lowercase',
  /**
   * The Whitespace tokenizer divides text into terms whenever it encounters any whitespace character.
   */
  whitespace = 'whitespace',
  /**
   * The UAX URL Email tokenizer is like the standard tokenizer except that it recognises URLs and email addresses as single tokens.
   */
  uax_url_email = 'uax_url_email',
  /**
   * The classic tokenizer is a grammar based tokenizer for the English Language.
   */
  classic = 'classic',
  /**
   * The thai tokenizer segments Thai text into words.
   */
  thai = 'thai',
  /**
   * The N-Gram tokenizer can break up text into words when it encounters any of a list of specified characters (e.g. whitespace or punctuation), then it returns n-grams of each word: a sliding window of continuous letters, e.g. `quick → [qu, ui, ic, ck]`.
   */
  ngram = 'ngram',
  /**
   * The Edge N-Gram tokenizer can break up text into words when it encounters any of a list of specified characters (e.g. whitespace or punctuation), then it returns n-grams of each word which are anchored to the start of the word, e.g. `quick → [q, qu, qui, quic, quick]`.
   */
  edge_ngram = 'edge_ngram',
  /**
   * The Keyword tokenizer is a “noop” tokenizer that accepts whatever text it is given and outputs the exact same text as a single term. It can be combined with token filters like lowercase to normalise the analysed terms.
   */
  keyword = 'keyword',
  /**
   * The Pattern tokenizer uses a regular expression to either split text into terms whenever it matches a word separator, or to capture matching text as terms.
   */
  pattern = 'pattern',
  /**
   * The Simple Pattern tokenizer uses a regular expression to capture matching text as terms. It uses a restricted subset of regular expression features and is generally faster than the pattern tokenizer.
   */
  simple_pattern = 'simple_pattern',
  /**
   * The Char Group tokenizer is configurable through sets of characters to split on, which is usually less expensive than running regular expressions.
   */
  char_group = 'char_group',
  /**
   * The Simple Pattern Split tokenizer uses the same restricted regular expression subset as the simple_pattern tokenizer, but splits the input at matches rather than returning the matches as terms.
   */
  simple_pattern_split = 'simple_pattern_split',
  /**
   * The path_hierarchy tokenizer takes a hierarchical value like a filesystem path, splits on the path separator, and emits a term for each component in the tree, e.g. `/foo/bar/baz; → [/foo, /foo/bar, /foo/bar/baz ]`.;
   */
  path_hierarchy = 'path_hierarchy',

  // TODO: more
}
