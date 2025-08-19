import * as d3 from 'd3';
import { CircleCanvasLayer } from '../../../src/layers/canvas/circleCanvasLayer';
import type { CircleLayerOptions } from '../../../src/types';

// Mock OpenLayers projection helpers used indirectly
jest.mock('ol/proj.js', () => ({
  transformExtent: jest.fn((ext: any) => ext),
  toLonLat: jest.fn(() => [0, 0]),
}));

function makeOptions(partial?: Partial<CircleLayerOptions>): CircleLayerOptions {
  const container = document.createElement('div');
  const svg = d3.select(document.body).append('svg') as any;
  return {
    svg,
    svgContainer: container,
    zIndex: 20,
    longitudes: [10, 20, 30],
    latitudes: [0, 5, -5],
    combinedCircleSizeValues: [1, 2, 3],
    circle1SizeValues: [1, 2, 3],
    circle2SizeValues: [1, 2, 3],
    minCircleSizeValue: 0,
    maxCircleSizeValue: 10,
    circleScale: 1,
    circleOptions: {
      layerControl: true,
      color1: '#ff0000',
      color2: '#00ff00',
      minRadius: 2,
      maxRadius: 20,
      strokeColor: '#000000',
      strokeWidth: 1,
      layer1Opacity: 1,
      layer2Opacity: 1,
      showLegend: false,
      legendTitle: '',
      legendTitleColor: '#000',
      legendItemStrokeColor: '#000',
      legendItemStrokeWidth: 1,
      leaderLineColor: '#000',
      leaderLineStrokeWidth: 1,
      labelTextColor: '#000',
      roundOffLegendValues: false,
      hideMinIfBelowThreshold: false,
      minValueThreshold: 0,
      minRadiusThreshold: 0,
      yPadding: 0,
      xPadding: 0,
      labelSpacing: 0,
      chartType: 'nested-circle',
      scalingMethod: 'square-root',
    },
    tooltipServiceWrapper: { addTooltip: jest.fn() } as any,
    selectionManager: { select: jest.fn().mockResolvedValue([]) } as any,
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

describe('CircleCanvasLayer (canvas)', () => {
  it('computes features extent (mock transformed as identity)', () => {
    const layer = new CircleCanvasLayer(makeOptions());
    const extent = (layer as any).getFeaturesExtent();
    expect(extent).toEqual([10, -5, 30, 5]);
  });

  it('render() creates a canvas and hit overlay group', () => {
    const opts = makeOptions();
    const layer = new CircleCanvasLayer(opts);
    const frameState = makeFrameState();
    const before = opts.svgContainer.querySelector('#circles-canvas');
    expect(before).toBeNull();

    const result = layer.render(frameState);
    expect(result).toBe(opts.svgContainer);

    const canvas = opts.svgContainer.querySelector('#circles-canvas') as HTMLCanvasElement;
    expect(canvas).toBeTruthy();
    expect(canvas.style.zIndex).toBe('20');

    const hitGroup = (opts.svg as any).select('#circles-hitlayer');
    expect(hitGroup.empty()).toBe(false);
  });
});
