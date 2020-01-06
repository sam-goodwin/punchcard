export class Writer {
  private tokens: string[] = [];

  private readonly aliases: {
    [alias: string]: string;
  } = {};
  private readonly values: {
    [id: string]: AWS.DynamoDB.AttributeValue;
  } = {};

  private namesCounter = 0;
  private valuesCounter = 0;

  public toExpression() {
    return {
      Expression: this.tokens.join(''),
      ExpressionAttributeNames: this.aliases,
      ExpressionAttributeValues: this.values
    };
  }

  public head(): string | undefined {
    return this.tokens.slice(-1)[0];
  }

  public pop(): string | undefined {
    return this.tokens.pop();
  }

  public writeToken(token: string) {
    this.tokens.push(token);
  }

  public writeValue(value: AWS.DynamoDB.AttributeValue): string {
    const id = this.newValueId();
    this.values[id] = value;
    this.writeToken(id);
    return id;
  }

  public writeName(name: string): string {
    const alias = this.newNameAlias();
    this.aliases[alias] = name;
    this.writeToken(alias);
    return alias;
  }

  private newNameAlias(): string  {
    return '#' + (this.namesCounter += 1).toString();
  }

  private newValueId(): string {
    return ':' + (this.valuesCounter += 1).toString();
  }
}