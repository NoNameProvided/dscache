# DSCache

[![CI](https://github.com/NoNameProvided/dscache/actions/workflows/continuous-integration-workflow.yml/badge.svg)](https://github.com/NoNameProvided/dscache/actions/workflows/continuous-integration-workflow.yml)
![npm](https://img.shields.io/npm/v/dscache)
[![Dependency Status](https://david-dm.org/NoNameProvided/dscache.svg)](https://david-dm.org/typestack/typedi)

A dead simple LRU style in-memory key-value cache with **eager key eviction**.

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

_To be written..._

## License

[MIT License](./LICENSE) © Attila Oláh
