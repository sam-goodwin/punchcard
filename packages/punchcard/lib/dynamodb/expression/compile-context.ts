import { Writer } from "../../shape/mapper/mapper";
import { Type } from "../../shape/types/type";

export interface CompileContext {
  readonly writer: Writer<AWS.DynamoDB.AttributeValue>;
  readonly names: AWS.DynamoDB.ExpressionAttributeNameMap;
  readonly values: AWS.DynamoDB.ExpressionAttributeValueMap;

  name(name: string): string;
  value<T extends Type<V>, V>(type: T, value: V): string;
  attributeValue(value: AWS.DynamoDB.AttributeValue): string;
}
export interface Compilable {
  compile(context: CompileContext): string;
}

export interface CompiledExpression {
  ConditionExpression: string;
  ExpressionAttributeNames?: AWS.DynamoDB.ExpressionAttributeNameMap;
  ExpressionAttributeValues?: AWS.DynamoDB.ExpressionAttributeValueMap;
}