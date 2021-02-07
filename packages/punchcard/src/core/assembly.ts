/**
 * A namespaced bag of properties stored as a flat key-value store of strings.
 *
 * This bag is translated to environment variables (hence the flat format).
 */
export class Namespace {
  constructor(
    public readonly scope: Namespace,
    protected readonly _namespace: string,
    protected readonly _properties: {[key: string]: string}) {}

  /**
   * Create a sub-bag of properties prefixed by a namespace.
   * @param namespace to prefix properties with.
   */
  public namespace(namespace: string) {
    return new Namespace(this, `${this._namespace}_${namespace}`, this._properties);
  }

  /**
   * Set the value of a property
   * @param name name of the property
   * @param value value of the property
   */
  public set(name: string, value: string): void {
    this._properties[this.makeKey(name)] = value;
  }

  /**
   * Get a property from the bag and throw if it does not exist.
   * @param name name of the property
   * @throws if the property does not exist
   */
  public get(name: string): string {
    const v = this.tryGet(name);
    if (v === undefined) {
      throw new Error(`property '${name}' does not exist`);
    }
    return v;
  }

  /**
   * Get a property from the bag if it exists.
   * @param name name of the property
   * @returns the property or undefined if it does not exist
   */
  public tryGet(name: string): undefined | string {
    return this._properties[this.makeKey(name)];
  }

  private makeKey(name: string): string {
    return `${this._namespace}_${name}`;
  }
}

export class Assembly extends Namespace {
  constructor(properties?: {[key: string]: string}) {
    super(undefined as any, 'punchcard', properties || {});
  }

  public get properties() {
    return {
      ...this._properties
    };
  }
}
