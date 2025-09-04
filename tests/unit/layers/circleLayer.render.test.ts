import * as d3 from 'd3';

jest.mock('ol/layer.js', () => ({ Layer: class { changed(){} } }));
jest.mock('ol/proj.js', () => ({ toLonLat: jest.fn(() => [0,0]) }));

import { CircleLayer } from '../../../src/layers/circleLayer';
import type { CircleLayerOptions } from '../../../src/types';
import { DomIds } from '../../../src/constants/strings';

function baseOptions(partial?: Partial<CircleLayerOptions>): CircleLayerOptions {
  const container = document.createElement('div');
  const svg = d3.select(document.body).append('svg') as any;
  return {
    svg,
    svgContainer: container,
    zIndex: 12,
    longitudes: [10,20],
    latitudes: [1,2],
    combinedCircleSizeValues: [5,10],
    circle1SizeValues: [5,10],
    circle2SizeValues: [2,4],
    minCircleSizeValue: 0,
    maxCircleSizeValue: 10,
    circleScale: 1,
    dataPoints: [
      { longitude: 10, latitude: 1, tooltip: [], selectionId: {} as any },
      { longitude: 20, latitude: 2, tooltip: [], selectionId: {} as any }
    ],
    circleOptions: {
      layerControl: true,
      color1: '#aa0000',
      color2: '#00aa00',
      minRadius: 2,
      maxRadius: 30,
      strokeColor: '#000000',
      strokeWidth: 1,
      layer1Opacity: 0.8,
      layer2Opacity: 0.6,
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
      scalingMethod: 'square-root'
    },
    selectionManager: { select: jest.fn().mockResolvedValue([]) } as any,
    tooltipServiceWrapper: { addTooltip: jest.fn() } as any,
    ...(partial as any),
  };
}

function frameState(resolution=2000): any { return { size:[600,400], viewState:{ center:[0,0], resolution, projection:{ code_: 'EPSG:3857'} } }; }

describe('CircleLayer render variants', () => {
  it('renders nested circle variant with circle elements', () => {
    const opts = baseOptions();
    const layer = new CircleLayer(opts);
    layer.render(frameState());
    const g1 = (opts.svg as any).select(`#${DomIds.CirclesGroup1}`);
    const g2 = (opts.svg as any).select(`#${DomIds.CirclesGroup2}`);
    expect(g1.empty()).toBe(false);
    expect(g2.empty()).toBe(false);
    const totalCircles = g1.selectAll('circle').nodes().length + g2.selectAll('circle').nodes().length;
    expect(totalCircles).toBeGreaterThanOrEqual(2);
  });

  it('renders donut chart arcs when chartType=donut-chart', () => {
    const base = baseOptions();
    const opts = baseOptions({ circleOptions: { ...base.circleOptions, chartType: 'donut-chart' } as any });
    const layer = new CircleLayer(opts);
    layer.render(frameState());
    const g2 = (opts.svg as any).select(`#${DomIds.CirclesGroup2}`);
    const paths = g2.selectAll('path').nodes();
    expect(paths.length).toBeGreaterThan(0);
  });

  it('renders pie chart arcs when chartType=pie-chart', () => {
    const base = baseOptions();
    const opts = baseOptions({ circleOptions: { ...base.circleOptions, chartType: 'pie-chart' } as any });
    const layer = new CircleLayer(opts);
    layer.render(frameState());
    const g2 = (opts.svg as any).select(`#${DomIds.CirclesGroup2}`);
    const paths = g2.selectAll('path').nodes();
    expect(paths.length).toBeGreaterThan(0);
  });

  it('setActive(false) prevents rendering groups', () => {
    const opts = baseOptions();
    const layer = new CircleLayer(opts);
    layer.setActive(false);
    layer.render(frameState());
    const g1 = (opts.svg as any).select(`#${DomIds.CirclesGroup1}`);
    expect(g1.empty()).toBe(true);
  });
});
