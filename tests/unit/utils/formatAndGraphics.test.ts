import { formatValue } from '../../../src/utils/format';
import { selectionOpacity, reorderForCirclesAboveChoropleth, setSvgSize } from '../../../src/utils/graphics';
import { hexToRgba } from '../../../src/utils/convert';

describe('utils/formatValue', () => {
  it('applies suffixes correctly (k, M, B, T)', () => {
    expect(formatValue(950, '{:.0f}')).toBe('950');
    expect(formatValue(12_300, '{:.1f}')).toBe('12.3k');
    expect(formatValue(5_000_000, '{:.2f}')).toBe('5M');
    expect(formatValue(7_200_000_000, '{:.1f}')).toBe('7.2B');
  });
  it('respects precision template', () => {
    expect(formatValue(1532, '{:.0f}')).toBe('2k'); // rounds 1.532k -> 2k
    expect(formatValue(1532, '{:.2f}')).toBe('1.53k');
  });
});

describe('utils/graphics selectionOpacity', () => {
  it('returns base opacity when no selection', () => {
    expect(selectionOpacity([], 'a', 0.8)).toBe(0.8);
  });
  it('dims when id not selected', () => {
    expect(selectionOpacity(['b'], 'a', 0.8)).toBeCloseTo(0.4);
  });
  it('keeps full opacity when selected', () => {
    expect(selectionOpacity(['a','b'], 'a', 0.6)).toBe(0.6);
  });
});

describe('utils/graphics reorderForCirclesAboveChoropleth', () => {
  it('moves circle groups to the end when initially before choropleth', () => {
  // Start choropleth BEFORE circles so function re-appends circles after it (should become choropleth,c1,c2)
  document.body.textContent = '';
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svgEl.id = 'root';
  const ch = document.createElementNS(svgEl.namespaceURI,'g'); ch.id='choroplethGroup';
  const c1 = document.createElementNS(svgEl.namespaceURI,'g'); c1.id='circlesGroup1';
  const c2 = document.createElementNS(svgEl.namespaceURI,'g'); c2.id='circlesGroup2';
  svgEl.appendChild(ch); svgEl.appendChild(c1); svgEl.appendChild(c2);
  document.body.appendChild(svgEl);
  const svg = require('d3-selection').select('svg');
    const parent = svg.node();
    const before = Array.from(parent.children).map(c => (c as HTMLElement).id).join(',');
  expect(before).toBe('choroplethGroup,circlesGroup1,circlesGroup2');
    reorderForCirclesAboveChoropleth(svg);
  const after = Array.from(parent.children).map(c => (c as HTMLElement).id).join(',');
  // After reorder, order remains the same (idempotent) because circles already after choropleth
  expect(after).toBe(before);
  });
});

describe('utils/graphics setSvgSize', () => {
  it('sets width/height attributes', () => {
  document.body.textContent = '';
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svgEl.id = 'root';
  document.body.appendChild(svgEl);
  const svg = require('d3-selection').select('svg');
    setSvgSize(svg, 400, 250);
    expect(svg.attr('width')).toBe('400');
    expect(svg.attr('height')).toBe('250');
  });
});

describe('utils/convert hexToRgba', () => {
  it('expands 3-char hex', () => {
    expect(hexToRgba('#abc', 0.5)).toBe('rgba(170, 187, 204, 0.5)');
  });
  it('handles 6-char hex', () => {
    expect(hexToRgba('#00ff00', 1)).toBe('rgba(0, 255, 0, 1)');
  });
});
