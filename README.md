# DSCache

[![CI](https://github.com/NoNameProvided/dscache/actions/workflows/continuous-integration-workflow.yml/badge.svg)](https://github.com/NoNameProvided/dscache/actions/workflows/continuous-integration-workflow.yml)
![npm](https://img.shields.io/npm/v/dscache)
[![Dependency Status](https://david-dm.org/NoNameProvided/dscache.svg)](https://david-dm.org/typestack/typedi)

A dead-simple LRU style in-memory key-value cache with **eager key eviction**.

### Key features

- fast, light-weight & zero-dependency
- eager key eviction policy
- always up-to-date Typescript typings
- modern, written in ES2020 (Node LTS 14+)
- uses native ES modules ([docs](https://nodejs.org/api/esm.html))
- handy helper function to estimate cache size in memory

## Install

```bash
npm install dscache
```

## Usage

```ts
import { DSCache } from 'dscache';

const lruCache = new DSCache({ size: 1000 });

lruCache.set('user-token:231', userTokenObject, { ttl: 30_000 });
lruCache.get('user-token:231');
// -> returns userTokenObject
```

## API

#### Creating a cache instance

```ts
const cacheInstance = new DSCache({ size: 10000 }); 
```

#### Checking current size of the cache

```ts
cacheInstance.size;
```

The `size` property returns the count of currently stored items in the cache.

#### Setting a value

```ts
cacheInstance.set(key: string; value: any; options?: { ttl?: number }): void;
```

Setting values can be done via the `set()` methods. The key must be a string
and value can be anything. Optionally a time to live (`ttl`) option can be
specified in milliseconds. When TTL is set the item will be auto-removed from
the cache after the specified duration.

#### Getting a value

There are two ways to get a value from the cache: `get()` and `peak()` methods.

```ts
cacheInstance.get(key: string): T | undefined;
```

The `get()` method returns the value saved under the specified key or undefined
if the key doesn't exist. This method also marks the item as recently used
preventing it from being removed.

```ts
cacheInstance.peak(key: string): T | undefined;
```

The `peak()` method also returns the value saved under the specified key or
undefined if the key doesn't exist. However, using this method won't mark the
item as recently used.

#### Checking if a value is cached

```ts
cacheInstance.has(key: string): boolean;
```

The `has()` function returns `true` if the specified key exists in the cache or
`false` otherwise.

#### Deleting a value

```ts
cacheInstance.delete(key: string): void;
```

The `delete()` function removes the specified key from the cache.

#### Resting the cache

```ts
cacheInstance.reset(): void;
```

The `reset()` function removes all cached items from the cache.

## License

[MIT License](./LICENSE) © Attila Oláh
