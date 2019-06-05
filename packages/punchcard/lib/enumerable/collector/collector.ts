import cdk = require('@aws-cdk/cdk');
import { Type } from '../../shape/types/type';
import { Enumerable } from '../enumerable';
import { StreamProps } from '../stream';
import { StreamCollector } from './stream';

/**
 * Collects data from an `Enumerable`.
 *
 * @param T type of collected result
 * @param E source enumerable
 */
export interface Collector<T, E extends Enumerable<any, any, any, any>> {
  /**
   * Create constructs to collect data from the enumerable an
   */
  collect(scope: cdk.Construct, id: string, enumerable: E): T
}

export namespace Collectors {
  /**
   * Collects data from an `Enumerable` in a Kinesis Stream.
   *
   * @param props stream properties
   */
  export function toStream<T extends Type<any>>(props: StreamProps<T>): StreamCollector<T, any> {
    return new StreamCollector<T, any>(props);
  }
}