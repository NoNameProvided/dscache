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
  private store: Map<string, CacheItem<T>> = new Map();

  /**
   * A helper array used in calculating which keys to evict. This array is
   * always ordered in eviction priority so the algorithm can exit as soon as
   * the stored item count is below the threshold.
   */
  private expirationStatistics: { key: string; expireAt: number }[] = [];

  /**
   * Returns the count of currently cached items.
   */
  get size(): number {
    return this.store.size;
  }

  private mostRecentBag: CacheItem<T> = { key: null as any } as any;

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

    /**
     * We need to delete and readd for multiple reasons:
     *  - We need to reset the iteration order via re-adding the element
     *  - We need to delete via the public API to reset the TTL of the previous item.
     *
     * Note: The public delete function calls the `evictItems()` function.
     */
    this.delete(key);

    if (valueBag.ttl) {
      /**
       * If TTL was provided we add it to TTL statistics for fast eviction.
       * The order of array is important, value should be ordered based on their expireAt value.
       */
      const insertBeforePosition =
        this.expirationStatistics.findIndex(item => item.expireAt > valueBag.iat + (valueBag.ttl as number)) - 1;
      this.expirationStatistics.splice(insertBeforePosition, 0, { key, expireAt: valueBag.iat + valueBag.ttl });
    }

    this.store.set(key, valueBag);
  }

  /**
   * Attempt to get the item with the specified key and marks it as recently used.
   * If no item exists with the specified key `undefined` is returned.
   */
  get(key: string): T | undefined {
    /**
     * If we request the same item as before and no TTL is set for it, aka it
     * cannot expire then we return it immediately for performance boost.
     */
    if (this.mostRecentBag.key === key && !this.mostRecentBag.ttl) {
      return this.mostRecentBag.value;
    }

    this.evictItems();

    const valueBag = this.store.get(key);

    if (valueBag) {
      /**
       * We need to delete and readd for multiple reasons:
       *  - We need to reset the iteration order via re-adding the element.
       *  - We need to delete via the internal API to __KEEP__ the TTL of the existing item.
       *
       * Note: The public delete function calls the `evictItems()` function.
       */
      // TODO: The below delete drops perf from 9,471,026 ops/sec to 5,468,890 ops/sec.
      this.store.delete(key);
      this.store.set(key, valueBag);

      this.mostRecentBag = valueBag;

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
    if (this.store.has(key)) {
      this.store.delete(key);
      // TODO: remove from TTL array
    }

    this.evictItems();
  }

  /**
   * Removes all currently cached item.
   */
  reset() {
    this.store.clear();
    this.expirationStatistics = [];
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
    let expirationExitIndex = 0;

    /** The TTL array is iterated until we reach the first item with valid TTL. */
    if (this.expirationStatistics.length) {
      this.expirationStatistics.every((item, index) => {
        expirationExitIndex = index;
        if (item.expireAt < Date.now()) {
          this.store.delete(item.key);

          return true;
        }

        return false;
      });

      /** We unshift the arrays with the saved exit indexes. */
      if (expirationExitIndex - 1 > 0) {
        this.expirationStatistics.splice(0, expirationExitIndex - 1);
      }
    }

    if (this.store.size > this.allowedCacheSize) {
      const iterator = this.store.entries();
      let iteratorResult: IteratorResult<[string, CacheItem<T>], any> = iterator.next();

      /**
       * While there are elements in the map to iterate over and we are above the
       * max allowed size, we iterate and remove elements. We can do this, because
       * the spec guarantees that a Map iterates over elements in same order as
       * they were added.
       */
      while (!iteratorResult.done && this.store.size > this.allowedCacheSize) {
        this.store.delete(iteratorResult.value[0]);

        iteratorResult = iterator.next();
      }
    }
  }
}
