import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CacheService } from '../../../src/services/CacheService';

// We'll control time via Date.now mocking
let now = 1000;
const realDateNow = Date.now;

function advance(ms: number){ now += ms; }

beforeEach(() => { now = 1000; (Date as any).now = jest.fn(() => now); });
afterAll(() => { (Date as any).now = realDateNow; });

describe('CacheService expiry & eviction', () => {
  it('expires entry after TTL', async () => {
    const cache = new CacheService();
    await cache.getOrFetch('k', async () => ({ data: 'v', response: null }), { ttlMs: 500 });
    expect(cache.get('k')).toBe('v');
    advance(400); expect(cache.get('k')).toBe('v');
    advance(200); expect(cache.get('k')).toBeUndefined(); // expired
  });

  it('evicts oldest when maxEntries exceeded', async () => {
    const cache = new CacheService();
    // override internal maxEntries to 2 for deterministic test
    (cache as any).maxEntries = 2;
    cache.set('a','A', 1000); advance(1);
    cache.set('b','B', 1000); advance(1);
    cache.set('c','C', 1000); // should evict 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('B');
    expect(cache.get('c')).toBe('C');
  });

  it('does not cache null/undefined results', async () => {
    const cache = new CacheService();
    await cache.getOrFetch('n', async () => ({ data: null, response: null }));
    expect(cache.get('n')).toBeUndefined();
  });

  it('removes pending on rejection allowing retry', async () => {
    const cache = new CacheService(); let calls = 0;
    await expect(cache.getOrFetch('k', async () => { calls++; throw new Error('fail'); })).rejects.toThrow('fail');
    await cache.getOrFetch('k', async () => { calls++; return { data: 'ok', response: null }; });
    expect(calls).toBe(2);
    expect(cache.get('k')).toBe('ok');
  });
});
