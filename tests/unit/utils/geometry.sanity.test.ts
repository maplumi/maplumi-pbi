import { describe, it, expect } from '@jest/globals';
import { isValidGeoJson, isValidTopoJson } from '../../../src/utils/geometry';

describe('geometry utils (sanity)', () => {
  it('isValidGeoJson basic FeatureCollection', () => {
    expect(isValidGeoJson({ type: 'FeatureCollection', features: []})).toBe(true);
  });
  it('rejects invalid geojson shape', () => {
    expect(isValidGeoJson({ type: 'BadType'})).toBe(false);
  });
  it('isValidTopoJson minimal Topology', () => {
    expect(isValidTopoJson({ type:'Topology', objects:{ a:{ type:'Point'} }, arcs: []})).toBe(true);
  });
  it('rejects non-topology topojson', () => {
    expect(isValidTopoJson({ type:'NotTopology'})).toBe(false);
  });
});
