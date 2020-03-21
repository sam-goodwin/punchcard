export class Cache {
  private readonly cache: {[key: string]: any} = {};

  /**
   * Get an item from the cache, creating it and caching it first (if it does not exist).
   * @param key - cache key
   * @param fac - function to create instance if it does not exist
   */
  public getOrCreate<T>(key: string, fac: () => T): T {
    if (!this.has(key)) {
      this.insert(key, fac());
    }
    return this.get(key);
  }

  /**
   * Insert a value into the cache.
   * @param key - cache key
   * @param value - value to cache
   */
  public insert(key: string, value: any): void {
    if (this.has(key)) {
      throw new Error(`cache already contains key '${key}'`);
    }
    // eslint-disable-next-line security/detect-object-injection
    this.cache[key] = value;
  }

  /**
   * Check if a value exists in the cache.
   * @param key - cache key to check
   */
  public has(key: string): boolean {
    // eslint-disable-next-line security/detect-object-injection
    return this.cache[key] !== undefined;
  }

  /**
   * Lookup a value in the cache and throw if it does not exist.
   * @param key - cache key to lookup
   * @returns the cached value
   * @throws if no value exists in the cache
   */
  public get(key: string): any {
    const v = this.tryGet(key);
    if (v === undefined) {
      throw new Error(`cache has no entry for '${key}'`);
    }
    return v;
  }

  /**
   * Lookup a value in the cache.
   * @param key - cache key to lookup
   * @returns the cached value or undefined if it does not exist.
   */
  // todo: fix implicit any
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  public tryGet(name: string) {
    // eslint-disable-next-line security/detect-object-injection
    return this.cache[name];
  }
}
