import { CacheService } from '../../src/services/CacheService';

function mockResponse(cacheControl?: string): Response {
  const headers = new Headers();
  if (cacheControl) headers.set('Cache-Control', cacheControl);
  return { headers } as unknown as Response;
}

describe('CacheService header-aware TTL', () => {
  it('honors Cache-Control max-age by capping TTL below fallback', async () => {
    const cache = new CacheService();
    const fallbackTtl = 30 * 60 * 1000; // 30 minutes

    const value = await cache.getOrFetch(
      'k-max-age-cap',
      async () => ({ data: 'v1', response: mockResponse('public, max-age=60') }),
      { ttlMs: fallbackTtl, respectCacheHeaders: true }
    );

    expect(value).toBe('v1');

    const entry = (cache as any).cache.get('k-max-age-cap');
    expect(entry).toBeTruthy();
    const ttlMs = entry.expiresAt - entry.timestamp;
    expect(ttlMs).toBe(60 * 1000); // capped to 60s from header
  });

  it('falls back to provided TTL when Cache-Control is missing', async () => {
    const cache = new CacheService();
    const fallbackTtl = 12_345;

    await cache.getOrFetch(
      'k-no-header',
      async () => ({ data: 'v2', response: mockResponse(undefined) }),
      { ttlMs: fallbackTtl, respectCacheHeaders: true }
    );

    const entry = (cache as any).cache.get('k-no-header');
    expect(entry).toBeTruthy();
    const ttlMs = entry.expiresAt - entry.timestamp;
    expect(ttlMs).toBe(fallbackTtl);
  });
});
