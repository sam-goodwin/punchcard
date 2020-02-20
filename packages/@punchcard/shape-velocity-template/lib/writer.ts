
export class Scope {
  // public add
}

export class Writer {
  private readonly tokens: string[];
  private indentation: number = 0;

  private get indentationToken(): string {
    return Array(this.indentation * 2).map(_ => ' ').join();
  }

  public compile(): string {
    return this.tokens.join('');
  }

  public indent() {
    this.indentation += 1;
  }

  public unindent() {
    this.indentation -= 1;
    if (this.indentation < 0) {
      this.indentation = 0;
    }
  }

  public writeToken(text: string): this {
    this.tokens.push(text);
    return this;
  }

  /**
   * Splits the text by new line and writes each at the indentation level.
   *
   * @param text
   */
  public writeText(text: string): this {
    text.split('\n').forEach(line => this.writeLine(line));
    return this;
  }

  public writeIndent(): this {
    return this.writeToken(this.indentationToken);
  }

  public writeLine(line: string): this {
    return this
      .writeToken(line)
      .writeNewLine();
  }

  public writeNewLine(): this {
    return this
      .writeToken('\n')
      .writeIndent();
  }

  public beginBlock(openText: string): this {
    this.writeToken(openText);
    this.writeNewLine();
    this.writeToken(this.indentationToken);
    return this;
  }

  public endBlock(closeText: string): this {
    this.writeNewLine();
    this.writeToken(closeText);
    return this;
  }
}
