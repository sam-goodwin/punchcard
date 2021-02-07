import { ShapeGuards } from '@punchcard/shape';
import { DynamoDSL } from './dynamo-repr';

export namespace DynamoGuards {
  export function isObject(a: any): a is DynamoDSL.Object {
    return ShapeGuards.isShape(a.dynamoType);
  }
}
