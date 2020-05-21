import { Core, DynamoDB, Lambda } from 'punchcard';

import { array, string, Record, optional, union, number, } from '@punchcard/shape';
import { ID, Api, Trait, Query, Mutation, Subscription, CachingBehavior, CachingInstanceType, $context, $if, VRecord, VObject } from 'punchcard/lib/appsync';
import { Scope } from 'punchcard/lib/core/construct';
import { VFunction } from '@punchcard/shape/lib/function';
import { $util } from 'punchcard/lib/appsync/lang/util';
import { UserPool } from 'punchcard/lib/cognito/user-pool';

class Dog extends Record('Dog', {
  breed: string,
  onlyOnDog: string
}) {}

class Cat extends Record('Cat', {
  breed: string,
  onlyOnCat: string
}) {}

class AnimalQueries extends Query({
  animals: union(Dog, Cat)
}) {}

const app = new Core.App();
const stack = app.stack('stack');

const api = new Api(stack, 'Api', {
  name: 'AnimalApi',
  userPool: null as any,
  fragments: [
    new AnimalQueries({
      animals: {
        *resolve() {
          return [{}] as any as VObject.Of<typeof Dog>
        }
      }
    })
  ]
});

async function main() {
  const result = (await api.Query(client => ({
    a: client
      .animals(_ => _
        .on('Cat', _ => _
          .breed()
          .onlyOnCat()
        )
        .on('Dog', _ => _
          .breed()
          .onlyOnDog()
        )
      )
  }))).a.animals;

  // compiles - available on both Dog and Cat
  result.breed;

  // doesn't compile ...
  // result.onlyOnCat;
  // result.onlyOnDog;

  // discrimate on the union
  if (result.__typename === 'Cat') {
    result.onlyOnCat;
  } else {
    result.onlyOnDog;
  }
}

function add<T, K extends string, V>(t: T, key: K, value: V): asserts t is typeof t & {
  [k in K]: V
} {
  (t as any)[key] = value;
}

const obj: {} = {}
add(obj, 'a', 1);
add(obj, 'b', 2 as const);
obj.a; // number
obj.b; // 2
