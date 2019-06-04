import cdk = require('@aws-cdk/cdk');
import { Enumerable } from '../enumerable/enumerable';

/**
 * Collects data from an Enumerable.
 *
 * @param T type of collected result
 * @param E source enumerable
 */
export interface Collector<T, E extends Enumerable<any, any, any, any>> {
  collect(scope: cdk.Construct, id: string, enumerable: E): T
}
