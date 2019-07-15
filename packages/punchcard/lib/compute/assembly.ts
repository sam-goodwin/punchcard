import core = require('@aws-cdk/core');
import { File } from './file-system';

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
  constructor(scope: core.Construct, properties?: {[key: string]: string}) {
    super(undefined as any, scope.node.uniqueId, properties || {});
  }

  public get properties() {
    return {
      ...this._properties
    };
  }
}

export class Cache {
  private readonly cache: {[key: string]: any} = {};

  /**
   * Get an item from the cache, creating it and caching it first (if it does not exist).
   * @param key cache key
   * @param fac function to create instance if it does not exist
   */
  public getOrCreate<T>(key: string, fac: () => T): T {
    if (!this.has(key)) {
      this.insert(key, fac());
    }
    return this.get(key);
  }

  /**
   * Insert a value into the cache.
   * @param key cache key
   * @param value value to cache
   */
  public insert(key: string, value: any): void {
    if (this.has(key)) {
      throw new Error(`cache already contains key '${key}'`);
    }
    this.cache[key] = value;
  }

  /**
   * Check if a value exists in the cache.
   * @param key cache key to check
   */
  public has(key: string): boolean {
    return this.cache[key] !== undefined;
  }

  /**
   * Lookup a value in the cache and throw if it does not exist.
   * @param key cache key to lookup
   * @return the cached value
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
   * @param key cache key to lookup
   * @return the cached value or undefined if it does not exist.
   */
  public tryGet(name: string) {
    return this.cache[name];
  }
}
