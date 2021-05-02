import { strictEqual } from 'assert';
import { DSCache } from '../build/dscache.js';
const { default: baretest } = await import('baretest');

const suite = baretest('Basic functionality');
let cache = new DSCache();

suite.before(() => {
  cache.reset();
  cache = new DSCache({ size: 3 });
});

suite('Add item to cache', () => {
  cache.set('ns:test', 42);

  strictEqual(cache.size, 1);
});

suite('Retrieve item from cache', () => {
  cache.set('ns:test', 42);

  strictEqual(cache.get('ns:test'), 42);
});

suite('Check LRU behaviour when cache limit reached', () => {
  cache.set('ns:test-1', 1);
  cache.set('ns:test-2', 2);
  cache.set('ns:test-3', 3);
  cache.set('ns:test-4', 4);

  strictEqual(cache.get('ns:test-1'), undefined);
  strictEqual(cache.get('ns:test-2'), 2);
  strictEqual(cache.get('ns:test-3'), 3);
  strictEqual(cache.get('ns:test-4'), 4);
});

export default suite;
