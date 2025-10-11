// Moved from root: requestHelpers.test.ts
/// <reference types="jest" />
import { isValidURL, enforceHttps, hasOpenRedirect, fetchWithTimeout } from '../../../src/utils/requestHelpers';

describe('requestHelpers', () => {
  describe('isValidURL', () => {
    it('returns true for well-formed URLs', () => {
      expect(isValidURL('https://example.com')).toBe(true);
    });

    it('returns false for malformed URLs', () => {
      expect(isValidURL('not a url')).toBe(false);
      expect(isValidURL('http//bad')).toBe(false); // missing colon
    });
  });

  describe('enforceHttps', () => {
    it('accepts https URLs', () => {
      expect(enforceHttps('https://secure.example.com')).toBe(true);
    });

    it('rejects non-https and invalid URLs', () => {
      const insecure = 'http' + '://insecure.example.com';
      expect(enforceHttps(insecure)).toBe(false);
      expect(enforceHttps('notaurl')).toBe(false);
    });
  });

  describe('hasOpenRedirect', () => {
    it('flags cross-origin absolute redirects', () => {
      expect(hasOpenRedirect('https://example.com/a?redirect=https://evil.com/x')).toBe(true);
      expect(hasOpenRedirect('https://example.com/a?url=//evil.com/y')).toBe(true);
    });

    it('flags javascript/data redirect values', () => {
      expect(hasOpenRedirect('https://example.com/a?next=javascript:alert(1)')).toBe(true);
      expect(hasOpenRedirect('https://example.com/a?return=data:text/html;base64,AAAA')).toBe(true);
    });

    it('treats invalid base URL as unsafe', () => {
      expect(hasOpenRedirect('not a url')).toBe(true);
    });

    it('allows safe relative redirects to same origin', () => {
      expect(hasOpenRedirect('https://example.com/a?return=/local/page')).toBe(false);
      expect(hasOpenRedirect('https://example.com/a?redirect=%2Finternal%2Fhome')).toBe(false);
    });
  });

  describe('fetchWithTimeout', () => {
    beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); (global.fetch as any).mockReset?.(); });

    it('resolves when fetch succeeds before timeout', async () => {
      const mockResponse = { ok: true } as Response as any;
  (global.fetch as any).mockImplementation(() => Promise.resolve(mockResponse));
      const p = fetchWithTimeout('https://example.com/data.json', 5000);
      jest.advanceTimersByTime(1000);
      await expect(p).resolves.toBe(mockResponse);
    });

    it('rejects when aborted due to timeout', async () => {
  (global.fetch as any).mockImplementation((_: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal as AbortSignal | undefined;
          if (signal) {
            if (signal.aborted) { reject(new Error('AbortError')); return; }
            signal.addEventListener('abort', () => reject(new Error('AbortError')));
          }
        });
      });
      const p = fetchWithTimeout('https://example.com/slow', 2000);
      jest.advanceTimersByTime(2000);
      await expect(p).rejects.toThrow('Request timed out or failed.');
    });
  });
});
