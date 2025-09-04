import { describe, it, expect } from '@jest/globals';
import { isWebGLAvailable } from '../../../src/utils/render';

describe('isWebGLAvailable', () => {
  it('override true', () => {
    (globalThis as any).__MAPLUMI_FORCE_WEBGL__ = true;
    expect(isWebGLAvailable()).toBe(true);
    delete (globalThis as any).__MAPLUMI_FORCE_WEBGL__;
  });
  it('override false', () => {
    (globalThis as any).__MAPLUMI_FORCE_WEBGL__ = false;
    expect(isWebGLAvailable()).toBe(false);
    delete (globalThis as any).__MAPLUMI_FORCE_WEBGL__;
  });
  it('canvas with webgl2 context returns true', () => {
    const originalCreate = document.createElement;
    (document as any).createElement = () => ({ getContext: (t: string) => (t === 'webgl2' ? { getParameter: () => 1 } : null) });
    try { expect(isWebGLAvailable()).toBe(true); } finally { (document as any).createElement = originalCreate; }
  });
  it('no contexts returns false', () => {
    const originalCreate = document.createElement;
    (document as any).createElement = () => ({ getContext: () => null });
    try { expect(isWebGLAvailable()).toBe(false); } finally { (document as any).createElement = originalCreate; }
  });
});
