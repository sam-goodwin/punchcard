import AWS = require('aws-sdk');
import { Writer } from '../../../shape/mapper';
import { RuntimeType } from '../../../shape/shape';
import { Type } from '../../../shape/types';
import * as Dynamo from '../mapper';
import { CompileContext } from './compile-context';

export class CompileContextImpl implements CompileContext {
  public readonly names: AWS.DynamoDB.ExpressionAttributeNameMap = {};
  public readonly values: AWS.DynamoDB.ExpressionAttributeValueMap = {};
  public readonly writer: Writer<AWS.DynamoDB.AttributeValue>;

  private readonly nameCache: { [key: string]: string } = {};
  private nameId: number = 0;
  private valueId: number = 0;

  constructor(writer?: Writer<AWS.DynamoDB.AttributeValue>) {
    this.writer = writer || Dynamo.Writer.instance;
  }

  public name(name: string): string {
    let nameId = this.nameCache[name];
    if (!nameId) {
      nameId = this.nextNameId();
      this.names[nameId] = name;
      this.nameCache[name] = nameId;
    }
    return nameId;
  }

  public value<T extends Type<any>>(type: T, value: RuntimeType<T>): string {
    const valueId = this.nextValueId();
    this.values[valueId] = this.writer.write(type, value);
    return valueId;
  }

  public attributeValue(value: AWS.DynamoDB.AttributeValue): string {
    const valueId = this.nextValueId();
    this.values[valueId] = value;
    return valueId;
  }

  private nextNameId(): string {
    const id = this.nameId;
    this.nameId += 1;
    return '#' + id;
  }

  private nextValueId(): string {
    const id = this.valueId;
    this.valueId += 1;
    return ':' + id;
  }
}
