export interface InitOptions {
  /**
   * Maximum number of allowed items in the cache.
   *
   * When an insert would result in having more items than allowed, the least
   * recently item is automatically purged from the cache.
   */
  size: number;

  /**
   * Key namespace for the cache. When enabled keys with a different namespace
   * will raise an error when being added to the cache.
   */
  namespace?: string;
}

export interface SetOptions {
  /**
   * TTL for the given key in milliseconds. The expiration date of the value
   * will be calculated as `Date.now() + TTL`.
   *
   * When an item expire it is automatically removed on the next interaction
   * with the cache.
   */
  ttl?: number;
}

/**
 * Represents a cached item and it's metadata stored in the cache.
 */
export interface CacheItem<T> {
  /**
   * The unique key for this item specified by the the user. A key is a variable
   * length string optionally prefixed with a namespace in format of
   * `namespace:key-name`.
   */
  key: string;

  /**
   * The time to live value specified by the user when the item was registered.
   * This value is undefined if no TTL was specified.
   */
  ttl: number | undefined;

  /**
   * Timestamp of the insertion in milliseconds. (Output of `Date.now()`)
   */
  iat: number;

  /**
   * The cached value.
   */
  value: T;
}
