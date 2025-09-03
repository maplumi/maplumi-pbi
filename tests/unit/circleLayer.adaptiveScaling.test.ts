import { describe, it, expect } from '@jest/globals';
// @ts-ignore internal import
import { CircleLayer } from '../../src/layers/circleLayer';

describe('CircleLayer.applyAdaptiveScaling outlier handling', () => {
  function invoke(value:number, min:number, max:number, actualValues:number[], opts?:Partial<any>) {
    const layer = Object.create(CircleLayer.prototype);
    const circleOptions = { minRadius: 3, maxRadius: 30, ...opts };
    const scaleFactor = 1; // simplification; real value derived earlier in code
    return (layer as any).applyAdaptiveScaling(value, min, max, scaleFactor, circleOptions, actualValues);
  }

  it('returns increased radius for outlier > maxValue when actual max larger', () => {
    const r95 = invoke(95, 0, 90, [10,20,40,60,90,120]);
    const outlier = invoke(120, 0, 90, [10,20,40,60,90,120]);
    expect(outlier).toBeGreaterThan(r95);
    expect(outlier).toBeLessThanOrEqual(30); // capped by maxRadius
  });

  it('clamps within normal range when no outlier condition', () => {
    const r = invoke(50, 0, 90, [10,20,40,60,90]);
    const r2 = invoke(60, 0, 90, [10,20,40,60,90]);
    expect(Math.abs(r2 - r)).toBeGreaterThan(0); // some scaling difference
  });
});
