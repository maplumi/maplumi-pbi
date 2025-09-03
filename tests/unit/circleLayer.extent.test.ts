import { describe, it, expect } from '@jest/globals';
// We import the layer to access its prototype, but we'll bypass heavy OL construction.
// @ts-ignore internal import
import { CircleLayer } from '../../src/layers/circleLayer';
// @ts-ignore internal import minimal types
import { transformExtent } from 'ol/proj';

// Create a lightweight instance without running the real constructor logic
function createBareLayer(): any {
  const obj = Object.create(CircleLayer.prototype);
  return obj;
}

describe('CircleLayer.calculateCirclesExtent (unit, isolated)', () => {
  it('returns zero-sized transformed extent on empty arrays', () => {
    const layer = createBareLayer();
    const extent = (layer as any).calculateCirclesExtent([], []);
    const zero = transformExtent([0,0,0,0], 'EPSG:4326', 'EPSG:3857');
    expect(extent).toEqual(zero);
  });

  it('returns zero-sized transformed extent on mismatched arrays', () => {
    const layer = createBareLayer();
    const extent = (layer as any).calculateCirclesExtent([10,20],[5]);
    const zero = transformExtent([0,0,0,0], 'EPSG:4326', 'EPSG:3857');
    expect(extent).toEqual(zero);
  });

  it('computes transformed extent for valid coordinates', () => {
    const layer = createBareLayer();
    const lons = [10,12,14];
    const lats = [5,6,7];
    const extent = (layer as any).calculateCirclesExtent(lons,lats);
    const zero = transformExtent([0,0,0,0], 'EPSG:4326', 'EPSG:3857');
    expect(extent).not.toEqual(zero);
    expect(extent[0]).toBeLessThan(extent[2]);
    expect(extent[1]).toBeLessThan(extent[3]);
  });
});
