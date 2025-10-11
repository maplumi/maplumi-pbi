import { describe, it, expect } from '@jest/globals';
import { hexToRgba } from '../../../src/utils/convert';

describe('hexToRgba', () => {
  it('expands 3-digit hex', () => {
    expect(hexToRgba('#abc', 0.5)).toBe('rgba(170, 187, 204, 0.5)');
  });
  it('handles 6-digit hex', () => {
    expect(hexToRgba('#AABBCC', 1)).toBe('rgba(170, 187, 204, 1)');
  });
  it('works without leading #', () => {
    expect(hexToRgba('ffffff', 0.2)).toBe('rgba(255, 255, 255, 0.2)');
  });
});
