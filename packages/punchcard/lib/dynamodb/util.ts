import dynamodb = require('@aws-cdk/aws-dynamodb');

import { Meta, RecordType, Shape, ShapeGuards } from '@punchcard/shape';
import { DDB } from '@punchcard/shape-dynamodb';

export function getKeyNames<A extends RecordType>(key: DDB.KeyOf<A>): [string, string | undefined] {
  const partitionKeyName: string = typeof key === 'string' ? key : (key as any)[0];
  const sortKeyName: string | undefined = typeof key === 'string' ? undefined : (key as any)[1];

  return [partitionKeyName, sortKeyName];
}

export function keyType(shape: Shape) {
  if (Meta.get(shape).nullable === true) {
    throw new Error(`dynamodb Key must not be optional`);
  }
  if (ShapeGuards.isStringShape(shape) || ShapeGuards.isTimestampShape(shape)) {
    return dynamodb.AttributeType.STRING;
  } else if (ShapeGuards.isBinaryShape(shape)) {
    return dynamodb.AttributeType.STRING;
  } else if (ShapeGuards.isNumericShape(shape)) {
    return dynamodb.AttributeType.NUMBER;
  }
  throw new Error(`shape of kind ${shape.Kind} can not be used as a DynamoDB Key`);
}