import * as d3 from 'd3';

jest.mock('ol/layer.js', () => ({ Layer: class { changed(){} } }));
jest.mock('ol/proj.js', () => ({ toLonLat: jest.fn(() => [0,0]) }));

import { ChoroplethLayer } from '../../../src/layers/choroplethLayer';
import type { ChoroplethLayerOptions, GeoJSON } from '../../../src/types';

function makeGeoJSON(): GeoJSON {
  // a few simple polygons so simplification has something to work with
  return {
    type: 'FeatureCollection',
    features: Array.from({length:4}).map((_,i) => ({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[i,0],[i+0.9,0],[i+0.9,0.9],[i,0.9],[i,0]]] },
      properties: { code: String.fromCharCode(65+i) }
    })) as any
  } as any;
}

function makeOptions(partial?: Partial<ChoroplethLayerOptions>): ChoroplethLayerOptions {
  const container = document.createElement('div');
  const svg = d3.select(document.body).append('svg') as any;
  const geojson = makeGeoJSON();
  return {
    svg,
    svgContainer: container,
    zIndex: 5,
    geojson,
    strokeColor: '#000',
    strokeWidth: 1,
    fillOpacity: 1,
    colorScale: () => '#123456',
    dataKey: 'code',
    categoryValues: ['A','B','C','D'],
    measureValues: [1,2,3,4],
    selectionManager: { select: jest.fn().mockResolvedValue([]) } as any,
    tooltipServiceWrapper: { addTooltip: jest.fn() } as any,
    simplificationStrength: 40, // mid strength for deterministic thresholds
    ...(partial as any),
  };
}

function frameState(resolution: number): any {
  return {
    size: [400, 300],
    viewState: { center: [0,0], resolution, projection: { code_: 'EPSG:3857'} },
  };
}

describe('ChoroplethLayer LOD simplification', () => {
  it('builds simplified cache entries for each LOD level', () => {
    const layer = new ChoroplethLayer(makeOptions());
    const resolutions = [8000, 6000, 3000, 1500, 800]; // coarse, low, medium, high, max
    resolutions.forEach(r => layer.render(frameState(r)));
    const cache: Map<string, any> = (layer as any).simplifiedCache;
    expect(cache.size).toBe(5);
    ['coarse','low','medium','high','max'].forEach(level => {
      expect(cache.has(`lod:${level}`)).toBe(true);
    });
  });

  it('re-uses cached simplified GeoJSON on second render for same LOD', () => {
    const layer = new ChoroplethLayer(makeOptions());
    const fs = frameState(3200); // medium LOD
    // Spy on internal simplify call by wrapping method
    const orig = (layer as any).getSimplifiedGeoJsonForResolution.bind(layer);
    const spy = jest.fn(orig);
    (layer as any).getSimplifiedGeoJsonForResolution = spy;
    layer.render(fs);
    // Second render should call simplify again but return from cache quickly for same LOD key
    layer.render(fs);
    expect(spy).toHaveBeenCalledTimes(2); // method invoked each render
    const cache = (layer as any).simplifiedCache;
    expect(cache.has('lod:medium')).toBe(true);
  });

  it('falls back to original geojson when topology unavailable', () => {
    const layer = new ChoroplethLayer(makeOptions());
    (layer as any).topoPresimplified = undefined;
    const original = (layer as any).geojson;
    const geo = (layer as any).getSimplifiedGeoJsonForResolution(5000);
    expect(geo).toBe(original);
  });
});
