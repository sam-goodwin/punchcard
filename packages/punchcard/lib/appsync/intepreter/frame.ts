export class Frame {
  private readonly ids: Generator<string>;

  private readonly tokens: (string | Frame)[] = [new Frame()];

  private readonly children: Frame[];

  constructor(private readonly parent?: Frame) {
    if (parent) {
      parent.children.push(this);
      this.ids = parent.ids;
    } else {
      this.ids = infinite();
    }
  }

  public render(): string {
    return this.tokens.map(t => {
      if (typeof t === 'string') {
        return t;
      } else {
        return t.render();
      }
    }).join('');
  }

  public get variables(): Frame {
    return this.tokens[0] as Frame;
  }

  public getNewId(): string {
    return this.ids.next().value;
  }

  public print(text: string): void {
    this.tokens.push(text);
  }
  public printLine(text: string): void {
    this.print(text);
    this.print('\n');
  }

  public block(f: (frame: Frame) => void): void {
    f(new Frame(this));
  }

  // public addDataSource(instance: any, dataSource: () => appsync.BaseDataSource): string {
  //   if (!this.dataSources.has(instance)) {
  //     this.dataSources.set(instance, {
  //       id: this.getNewId(),
  //       dataSource: dataSource()
  //     });
  //   }
  //   return this.dataSources.get(instance)!.id;
  // }
}

function* infinite() {
  let i = 1;
  while (true) {
    yield 'var' + i.toString(10);
    i += 1;
    if (i === Number.MAX_SAFE_INTEGER) {
      throw new Error(`reached maximum value of safe integers. how did you manage to do that?!`);
    }
  }
}