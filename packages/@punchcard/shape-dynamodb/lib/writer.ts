import { DSL } from './dsl';

export class Writer {
  private tokens: string[] = [];

  constructor(public readonly namespace: Writer.Namespace = new Writer.Namespace()) {}

  public toExpression() {
    return {
      Expression: this.tokens.join(''),
      ExpressionAttributeNames: this.namespace.aliases,
      ExpressionAttributeValues: this.namespace.values
    };
  }

  public head(): string | undefined {
    return this.tokens.slice(-1)[0];
  }

  public pop(): string | undefined {
    return this.tokens.pop();
  }

  public writeNode(value: DSL.Node): void {
    value[DSL.Synthesize](this);
  }

  public writeToken(token: string): void {
    this.tokens.push(token);
  }

  public writeName(name: string): void {
    this.writeToken(this.namespace.addName(name));
  }

  public writeValue(value: AWS.DynamoDB.AttributeValue): void {
    if (value.N) {
      this.tokens.push(value.N);
    } else {
      this.writeToken(this.namespace.addValue(value));
    }
  }
}
export namespace Writer {
  export class Namespace {
    public readonly aliases: {
      [alias: string]: string;
    } = {};
    public readonly aliasReverseLookup: {
      [name: string]: string;
    } = {};
    public readonly values: {
      [id: string]: AWS.DynamoDB.AttributeValue;
    } = {};

    private namesCounter = 0;
    private valuesCounter = 0;

    public addValue(value: AWS.DynamoDB.AttributeValue): string {
      const id = this.newValueId();
      this.values[id] = value;
      return id;
    }

    public addName(name: string): string {
      let alias = this.aliasReverseLookup[name];
      if (alias === undefined) {
        alias = this.newNameAlias();
        this.aliases[alias] = name;
        this.aliasReverseLookup[name] = alias;
      }
      return alias;
    }

    private newNameAlias(): string  {
      return '#' + (this.namesCounter += 1).toString();
    }

    private newValueId(): string {
      return ':' + (this.valuesCounter += 1).toString();
    }
  }

}