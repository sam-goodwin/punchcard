import type * as appsync from '@aws-cdk/aws-appsync';

import { Shape } from '@punchcard/shape';
import { Build } from '../../core/build';
import { Scope } from '../../core/construct';

export interface ResolverFunction<T extends Shape, U extends Shape> {
  readonly owner: any;
  readonly input: T;
  readonly output: U;
}
