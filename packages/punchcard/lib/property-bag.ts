/**
 * A namespaced bag of properties stored as a flat key-value store of strings.
 *
 * This bag is translated to environment variables (hence the flat format).
 */
export class PropertyBag {
  constructor(
    protected readonly namespace: string,
    protected readonly bag: {[key: string]: string}) {}

  /**
   * @return a copy of the properties contained by this bag
   */
  public get properties() {
    return {
      ...this.bag
    };
  }

  /**
   * Create a sub-bag of properties prefixed by a namespace.
   * @param namespace to prefix properties with.
   */
  public push(namespace: string) {
    return new PropertyBag(`${this.namespace}_${namespace}`, this.bag);
  }

  /**
   * Set the value of a property
   * @param name name of the property
   * @param value value of the property
   */
  public set(name: string, value: string): void {
    this.bag[this.makeKey(name)] = value;
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
    return this.bag[this.makeKey(name)];
  }

  private makeKey(name: string): string {
    return `${this.namespace}_${name}`;
  }
}

/**
 * A property bag, also containing a cache for heavy state such as AWS clients.
 *
 * Cached values are not namespaced - consumers are responsible for avoiding collisions.
 */
export class RuntimePropertyBag extends PropertyBag {
  constructor(namespace: string, bag: {[key: string]: string}, protected readonly cache: {[key: string]: any}) {
    super(namespace, bag);
  }

  public push(namespace: string): RuntimePropertyBag {
    return new RuntimePropertyBag(`${this.namespace}_${namespace}`, this.bag, this.cache);
  }

  /**
   * Insert a value into the cache.
   * @param key cache key
   * @param value value to cache
   */
  public insertCache(key: string, value: any): void {
    if (this.hasCache(key)) {
      throw new Error(`cache already contains key '${key}'`);
    }
    this.cache[key] = value;
  }

  /**
   * Check if a value exists in the cache.
   * @param key cache key to check
   */
  public hasCache(key: string): boolean {
    return this.cache[key] !== undefined;
  }

  /**
   * Lookup a value in the cache and throw if it does not exist.
   * @param key cache key to lookup
   * @return the cached value
   * @throws if no value exists in the cache
   */
  public lookupCache(key: string): any {
    const v = this.tryLookupCache(key);
    if (v === undefined) {
      throw new Error(`cache has no entry for '${key}'`);
    }
    return v;
  }

  /**
   * Lookup a value in the cache.
   * @param key cache key to lookup
   * @return the cached value or undefined if it does not exist.
   */
  public tryLookupCache(name: string) {
    return this.cache[name];
  }
}
