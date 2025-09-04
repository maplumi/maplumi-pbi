import * as d3 from 'd3';

// Mock OpenLayers base Layer to keep tests lightweight
jest.mock('ol/layer.js', () => ({
  Layer: class { changed() {/* no-op */} }
}));

// Mock projection helpers used indirectly by createWebMercatorProjection
jest.mock('ol/proj.js', () => ({
  toLonLat: jest.fn(() => [0, 0]),
}));

import { ChoroplethLayer } from '../../../src/layers/choroplethLayer';
import type { ChoroplethLayerOptions, GeoJSON } from '../../../src/types';
import { DomIds } from '../../../src/constants/strings';

function makeGeoJSON(): GeoJSON {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] },
        properties: { code: 'A' }
      },
      {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[2,2],[3,2],[3,3],[2,3],[2,2]]] },
        properties: { code: 'B' }
      }
    ] as any
  } as any;
}

function makeOptions(partial?: Partial<ChoroplethLayerOptions>): ChoroplethLayerOptions {
  const container = document.createElement('div');
  const svg = d3.select(document.body).append('svg') as any;
  const geojson = makeGeoJSON();
  return {
    svg,
    svgContainer: container,
    zIndex: 10,
    geojson,
    strokeColor: '#111',
    strokeWidth: 1,
    fillOpacity: 0.9,
    colorScale: (v: any) => v === 1 ? '#ff0000' : '#00ff00',
    dataKey: 'code',
    categoryValues: ['A','B'],
    measureValues: [1,2],
    selectionManager: { select: jest.fn().mockResolvedValue([]) } as any,
    tooltipServiceWrapper: { addTooltip: jest.fn() } as any,
    dataPoints: [
      { pcode: 'A', value: 1, tooltip: [], selectionId: {} as any },
      { pcode: 'B', value: 2, tooltip: [], selectionId: {} as any },
    ],
    ...(partial as any),
  };
}

function frameState(resolution = 4000): any {
  return {
    size: [800, 600],
    viewState: {
      center: [0,0],
      resolution,
      projection: { code_: 'EPSG:3857' },
    },
  };
}

describe('ChoroplethLayer render basics', () => {
  it('constructs value lookup and spatial index', () => {
    const opts = makeOptions();
    const layer = new ChoroplethLayer(opts);
    expect(layer.valueLookup).toEqual({ A: 1, B: 2 });
    // spatial index should exist with two items loaded
    const index = (layer as any).spatialIndex;
    expect(index).toBeTruthy();
    expect(index.data.children.length).toBeGreaterThan(0); // rbush internal structure
  });

  it('render creates choropleth group with path elements', () => {
    const opts = makeOptions();
    const layer = new ChoroplethLayer(opts);
    const fs = frameState();
    const result = layer.render(fs);
    expect(result).toBe(opts.svgContainer);
    const group = (opts.svg as any).select(`#${DomIds.ChoroplethGroup}`);
    expect(group.empty()).toBe(false);
    const paths = group.selectAll('path').nodes();
    expect(paths.length).toBe(2);
    // fill colors based on measure value mapping
    expect(paths[0].getAttribute('fill')).toBe('#ff0000');
    expect(paths[1].getAttribute('fill')).toBe('#00ff00');
  });

  it('setActive(false) prevents render output', () => {
    const opts = makeOptions();
    const layer = new ChoroplethLayer(opts);
    layer.setActive(false);
    const fs = frameState();
    layer.render(fs);
    const group = (opts.svg as any).select(`#${DomIds.ChoroplethGroup}`);
    expect(group.empty()).toBe(true);
  });
});
