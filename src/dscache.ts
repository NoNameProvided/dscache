import { SetOptions, InitOptions, CacheItem } from './interfaces';

export class DSCache<T> {
  /**
   * Max allowed cache size. When size would be exceeded on insert the
   * least recently used item will be evicted after the insert operation.
   */
  private allowedCacheSize: number = Infinity;

  /**
   * Keys can be namespaced with the `namespace:key-name` format. When the
   * namespace is set on initialization only keys with the same namespace are
   * allowed to be saved.
   */
  private namespace: string | undefined = undefined;

  /**
   * The internal storage for the cached items.
   */
  private store = new Map<string, CacheItem<T>>();

  /**
   * A helper array used in calculating which keys to evict. This array is
   * always ordered in eviction priority so the algorithm can exit as soon as
   * the stored item count is below the threshold.
   */
  private expirationStatistics: { key: string; expireAt: number }[] = [];

  /**
   * A helper array used in calculating which keys to evict. This array is
   * always ordered in eviction priority so the algorithm can exit as soon as
   * the stored item count is below the threshold.
   *
   * Due to how values are evicted, this array may contain value for removed elements
   * but they will eventually be removed. When an item is removed because it's TTL
   * has expired it won't get removed from this array automatically.
   */
  private usageStatistics: { key: string; lastAccessed: number }[] = [];

  /**
   * Returns the count of currently cached items.
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Creates a new cache instance.
   */
  constructor(initOptions: InitOptions) {
    this.allowedCacheSize = initOptions?.size || Infinity;
    this.namespace = initOptions?.namespace || undefined;
  }

  /**
   * Sets the specified value with the specified key. If the key already exists
   * it's value is overwritten. Optionally a TTL (time to live) value can be
   * specified as milliseconds from now.
   */
  set(key: string, value: any, options?: SetOptions): void {
    const normalizedTtl = Number.isInteger(options?.ttl) ? options?.ttl : undefined;
    const valueBag: CacheItem<T> = { key, value, iat: Date.now(), ttl: normalizedTtl };

    if (this.namespace && !key.startsWith(this.namespace)) {
      throw new Error(`Failed to set value for "${key}" because it's not in ${this.namespace} namespace!`);
    }

    this.store.set(key, valueBag);
    this.usageStatistics.push({ key, lastAccessed: valueBag.iat });

    if (valueBag.ttl) {
      /**
       * If TTL was provided we add it to TTL statistics for fast eviction.
       * The order of array is important, value should be ordered based on their expireAt value.
       */
      const insertBeforePosition =
        this.expirationStatistics.findIndex(item => item.expireAt > valueBag.iat + (valueBag.ttl as number)) - 1;
      this.expirationStatistics.splice(insertBeforePosition, 0, { key, expireAt: valueBag.iat + valueBag.ttl });
    }

    this.evictItems();
  }

  /**
   * Attempt to get the item with the specified key and marks it as recently used.
   * If no item exists with the specified key `undefined` is returned.
   */
  get(key: string): T | undefined {
    this.evictItems();

    if (this.store.has(key)) {
      const valueBag = this.store.get(key) as CacheItem<T>;
      this.usageStatistics.push({ key, lastAccessed: Date.now() });

      return valueBag.value;
    }

    return undefined;
  }

  /**
   * Checks if an item with the specified key exists.
   */
  has(key: string): boolean {
    this.evictItems();

    return this.store.has(key);
  }

  /**
   * Gets an item with the specified key without marking it as recently used.
   */
  peak(key: string): T | undefined {
    this.evictItems();

    return this.store.get(key)?.value;
  }

  /**
   * Removes an item from the cache.
   */
  delete(key: string): void {
    this.store.delete(key);
    this.evictItems();
  }

  /**
   * Removes all currently cached item.
   */
  reset() {
    this.store.clear();
    this.usageStatistics = [];
  }

  /**
   * Returns the content of the cache as an array. The return value of this
   * function can be passed to the `load()` function to restore a cache.
   */
  dump(): CacheItem<T>[] {
    this.evictItems();

    return Array.from(this.store, ([, value]) => value);
  }

  /**
   * Loads the received data into the cache if it is empty. When the cache size
   * limit is reached the remaining values are discarded.
   */
  load(data: CacheItem<T>[]) {
    if (this.store.size !== 0) {
      throw new Error("Cannot load data into cache, because it's not empty!");
    }

    data.every((item, index) => {
      this.set(item.key, item.value, { ttl: item.ttl });

      /** We exit the loading if cache size limit is reached. */
      return index < this.allowedCacheSize;
    });
  }

  /**
   * Evicts all items which has an expired TTL or above the cache size limit.
   */
  private evictItems() {
    const now = Date.now();
    let expirationExitIndex = 0;
    let usageExitIndex = 0;

    /** The TTL array is iterated until we reach the first item with valid TTL. */
    this.expirationStatistics.every((item, index) => {
      expirationExitIndex = index;
      if (item.expireAt < now) {
        this.store.delete(item.key);

        return true;
      }

      return false;
    });

    /** The usage array is iterated until we reach the first item being under allowed cache size. */
    this.usageStatistics.every((item, index) => {
      usageExitIndex = index;

      if (this.store.size > this.allowedCacheSize) {
        this.store.delete(item.key);

        return true;
      }

      return false;
    });

    /** We unshift the arrays with the saved exit indexes. */
    this.expirationStatistics.splice(0, expirationExitIndex - 1);
    this.expirationStatistics.splice(0, usageExitIndex - 1);
  }
}
