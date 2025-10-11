// Moved from root: cacheService.coalescing.test.ts
import { CacheService } from '../../../src/services/CacheService';

describe('CacheService coalescing', () => {
  it('coalesces concurrent fetches under same key', async () => {
    const cache = new CacheService();
    let calls = 0;
    const p = Promise.all([
      cache.getOrFetch('k', async () => { calls++; return { data: 'v', response: undefined as any }; }),
      cache.getOrFetch('k', async () => { calls++; return { data: 'v', response: undefined as any }; })
    ]);
    const [a,b] = await p; expect(a).toBe('v'); expect(b).toBe('v'); expect(calls).toBe(1);
  });
});
import { describe, it, expect } from '@jest/globals';
import { CacheService } from '../../../src/services/CacheService';

function delay<T>(ms:number,v:T){return new Promise(r=>setTimeout(()=>r(v),ms));}

describe('CacheService coalescing', () => {
  it('coalesces concurrent fetches', async () => {
    const cache = new CacheService(); let calls=0;
    const fn = jest.fn().mockImplementation(async()=>{calls++; return delay(10,'VAL');});
    const [a,b]=await Promise.all([cache.getOrFetch('k',fn), cache.getOrFetch('k',fn)]);
    expect(a).toBe('VAL'); expect(b).toBe('VAL'); expect(calls).toBe(1);
  });
});