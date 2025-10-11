import { describe, it, expect } from '@jest/globals';
// @ts-ignore
import { CircleLayer } from '../../../src/layers/circleLayer';

function invoke(v:number,min:number,max:number,vals:number[]){ const layer=Object.create(CircleLayer.prototype); return (layer as any).applyAdaptiveScaling(v,min,max,1,{minRadius:3,maxRadius:30},vals); }

describe('CircleLayer.applyAdaptiveScaling', () => {
  it('outlier bigger', () => { const r95=invoke(90,0,90,[10,90,120]); const out=invoke(120,0,90,[10,90,120]); expect(out).toBeGreaterThan(r95); });
});