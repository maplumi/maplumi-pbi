import * as d3 from 'd3';
import { ChoroplethCanvasLayer } from '../../../src/layers/canvas/choroplethCanvasLayer';
import type { ChoroplethLayerOptions, GeoJSON } from '../../../src/types';

// Mock OpenLayers projection helpers used indirectly
jest.mock('ol/proj.js', () => ({
  transformExtent: jest.fn((ext: any) => ext),
  toLonLat: jest.fn(() => [0, 0]),
}));

function makeGeoJSON(): GeoJSON {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]]},
        properties: { code: 'A' }
      },
      {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[2,2],[3,2],[3,3],[2,3],[2,2]]]},
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
    strokeColor: '#000000',
    strokeWidth: 1,
    fillOpacity: 1,
    colorScale: () => '#ff0000',
    dataKey: 'code',
    categoryValues: ['A','B'],
    measureValues: [1,2],
    selectionManager: { select: jest.fn().mockResolvedValue([]) } as any,
    tooltipServiceWrapper: { addTooltip: jest.fn() } as any,
    ...(partial as any),
  };
}

function makeFrameState(width = 800, height = 600): any {
  return {
    size: [width, height],
    viewState: {
      center: [0, 0],
      resolution: 1000,
      projection: 'EPSG:3857' as any,
    },
  };
}

describe('ChoroplethCanvasLayer (canvas)', () => {
  it('computes features extent (mock transformed as identity)', () => {
    const layer = new ChoroplethCanvasLayer(makeOptions());
    const extent = (layer as any).getFeaturesExtent();
    expect(extent).toEqual([0, 0, 3, 3]);
  });

  it('render() creates a canvas and hit overlay group', () => {
    const opts = makeOptions();
    const layer = new ChoroplethCanvasLayer(opts);
    const frameState = makeFrameState();

    const before = opts.svgContainer.querySelector('#choropleth-canvas');
    expect(before).toBeNull();

    const result = layer.render(frameState);
    expect(result).toBe(opts.svgContainer);

    const canvas = opts.svgContainer.querySelector('#choropleth-canvas') as HTMLCanvasElement;
    expect(canvas).toBeTruthy();
    expect(canvas.style.zIndex).toBe('10');

    const hitGroup = (opts.svg as any).select('#choropleth-hitlayer');
    expect(hitGroup.empty()).toBe(false);
  });
});
