import { strictEqual } from 'assert';
import { DSCache } from '../build/dscache.js';
const { default: baretest } = await import('baretest');

class TimeManipulator {
  constructor() {
    this.originalDateNow = Date.now;
    this.currentTime = 0;
    Date.now = () => this.currentTime;
  }

  resetTime() {
    this.currentTime = 0;
  }

  seek(ms) {
    this.currentTime += ms;
  }

  /** Restore the original now() function. */
  restore() {
    Date.now = this.originalDateNow;
  }
}

const suite = baretest('TTL functionality');

suite('Should not return expired item', () => {
  const time = new TimeManipulator();
  const cache = new DSCache({ size: 100 });

  /** We set value with 1 sec TTL. */
  cache.set('ns:test', 42, { ttl: 1000 });

  /** Value should be readable after 500ms elapsed. */
  time.seek(500);
  strictEqual(cache.get('ns:test'), 42);

  /** Value should be not readable after 1sec elapsed. */
  time.seek(501);

  strictEqual(cache.has('ns:test'), false);
  strictEqual(cache.get('ns:test'), undefined);

  time.restore();
});

suite('Interaction with cache should remove expired items.', () => {
  const time = new TimeManipulator();
  const cache = new DSCache({ size: 100 });

  cache.set('ns:test-1', 1, { ttl: 1000 });
  cache.set('ns:test-2', 2, { ttl: 500 });

  strictEqual(cache.size, 2);

  time.seek(600);
  strictEqual(cache.has('ns:test-1'), true);
  strictEqual(cache.has('ns:test-2'), false);

  time.seek(500);
  strictEqual(cache.has('ns:test-1'), false);
  strictEqual(cache.has('ns:test-2'), false);

  time.restore();
});

suite('TTL expired item should be removed first when cache size exceeded.', () => {
  const time = new TimeManipulator();
  const cache = new DSCache({ size: 3 });

  cache.set('ns:test-1', 1, { ttl: 1000 });
  cache.set('ns:test-2', 2);
  cache.set('ns:test-3', 3);

  time.seek(100);
  /** Update recently used status. */
  cache.get('ns:test-1');

  time.seek(1000);
  cache.set('ns:test-4', 4);

  strictEqual(cache.has('ns:test-1'), false);
  strictEqual(cache.has('ns:test-2'), true);
  strictEqual(cache.has('ns:test-3'), true);
  strictEqual(cache.has('ns:test-4'), true);

  time.restore();
});

export default suite;
