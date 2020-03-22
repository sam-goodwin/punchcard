export class Writer {
  private tokens: string[] = [];

  public toJsonPath(): string {
    return this.tokens.join("");
  }

  public head(): string | undefined {
    return this.tokens.slice(-1)[0];
  }

  public pop(): string | undefined {
    return this.tokens.pop();
  }

  public writeToken(token: string): void {
    this.tokens.push(token);
  }
}
