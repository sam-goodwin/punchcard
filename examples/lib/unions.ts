import { Core, DynamoDB, Lambda } from 'punchcard';

import { array, string, Record, optional, } from '@punchcard/shape';
import { ID, Api, Trait, Query, Mutation, Subscription, CachingBehavior, CachingInstanceType, $context, $if } from 'punchcard/lib/appsync';
import { Scope } from 'punchcard/lib/core/construct';
import { VFunction } from '@punchcard/shape/lib/function';
import { $util } from 'punchcard/lib/appsync/lang/util';
import { UserPool } from 'punchcard/lib/cognito/user-pool';

export class Dog extends Record('Dog', {
  
}) {}






