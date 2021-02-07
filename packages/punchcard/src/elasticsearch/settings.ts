import { TokenFilter } from './token-filter';
import { Tokenizer } from './tokenizer';

export interface CustomAnalyzer {
  type: 'custom';
  tokenizer: Tokenizer;
  filter: TokenFilter[] | string[];
}
export interface CustomIndexSettings {
  analysis?: {
    analyzer?: Record<string, CustomAnalyzer>
  }
}
