import { Layer } from 'ol/layer.js';
import { FrameState } from 'ol/Map';
import { State } from 'ol/source/Source';
import { ChoroplethLayerOptions, GeoJSONFeature } from '../../types';
import { getCanvasAndCtx, mercatorProjector } from './canvasUtils';
import rbush from 'rbush';
import * as d3 from 'd3';
import { createWebMercatorProjection } from '../../utils/map';
import { selectionOpacity } from '../../utils/graphics';
import type { Extent } from 'ol/extent.js';
import { transformExtent } from 'ol/proj.js';

export class ChoroplethCanvasLayer extends Layer {
  public options: ChoroplethLayerOptions;
  private selectedIds: powerbi.extensibility.ISelectionId[] = [];
  private isActive = true;
  private valueLookup: { [key: string]: number } = {};
  private index: any;
  private geojson: any;

  constructor(options: ChoroplethLayerOptions) {
    super({ ...options, zIndex: options.zIndex || 10 });
    this.options = options;
    this.geojson = options.geojson;
    const pCodes = options.categoryValues as string[];
    const vals = options.measureValues as number[];
    pCodes.forEach((p, i) => { this.valueLookup[p] = vals[i]; });

    this.index = new rbush();
    const items = this.geojson.features.map((f: GeoJSONFeature) => {
      const b = bounds(f);
      return { minX: b[0][0], minY: b[0][1], maxX: b[1][0], maxY: b[1][1], feature: f };
    });
    this.index.load(items);

    this.changed();
  }

  getSourceState(): State { return 'ready'; }
  setActive(active: boolean) { this.isActive = active; this.changed(); }

  render(frameState: FrameState) {

    if (!this.isActive) return;
    const width = frameState.size[0];
    const height = frameState.size[1];

    // Place choropleth canvas inside the map viewport so WebGL circles (map layer) can render above it
    const map: any = (this as any).getMap?.();
    const container: HTMLElement = map?.getViewport?.() || this.options.svgContainer;
    const { canvas, ctx, dpr } = getCanvasAndCtx(container, width, height, 'choropleth-canvas');

  // Keep polygons below circles; tests expect zIndex '10' on this canvas
  canvas.style.zIndex = '10';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    const project = mercatorProjector(frameState, width, height);

    // Remove previous hit layer and create a new one
    this.options.svg.select('#choropleth-hitlayer').remove();
    const hitLayer = this.options.svg.append('g').attr('id', 'choropleth-hitlayer');
    hitLayer.style('pointer-events', 'all');
    const d3Projection = createWebMercatorProjection(frameState, width, height);
    const d3Path = d3.geoPath().projection(d3Projection as any);

    // Basic fill of polygons
    for (const feature of this.geojson.features as GeoJSONFeature[]) {
      const pCode = feature.properties[this.options.dataKey];
      const value = this.valueLookup[pCode];
      const fill = (pCode === undefined || value === undefined) ? 'transparent' : this.options.colorScale(value);
      const dp = this.options.dataPoints?.find(d => d.pcode === pCode);
      const alpha = selectionOpacity(this.selectedIds, dp?.selectionId as any, this.options.fillOpacity);
      drawPolygon(ctx, feature, project, fill, this.options.strokeColor, this.options.strokeWidth, alpha);

      // Invisible hit path mirrors the feature geometry for tooltip/selection
      const hit = hitLayer.append('path')
        .datum(feature as any)
        .attr('d', d3Path as any)
        .style('fill', 'transparent')
        .style('stroke', 'transparent')
        .style('cursor', 'pointer')
        .style('pointer-events', 'all')
        .datum(feature.properties?.selectionId || this.options.dataPoints?.find(d => d.pcode === pCode)?.selectionId);

      const dataPoint = dp;
      if (dataPoint?.tooltip) {
        this.options.tooltipServiceWrapper.addTooltip(
          hit as any,
          () => dataPoint.tooltip,
          () => dataPoint.selectionId,
          true
        );
      }
      hit.on('click', (event: MouseEvent) => {
        if (!dp?.selectionId) return;
        const nativeEvent = event;
        this.options.selectionManager.select(dp.selectionId as any, nativeEvent.ctrlKey || nativeEvent.metaKey)
          .then((selectedIds: powerbi.extensibility.ISelectionId[]) => { this.selectedIds = selectedIds; this.changed(); });
      });
    }

    return this.options.svgContainer;
  }

  setSelectedIds(selectionIds: powerbi.extensibility.ISelectionId[]) { this.selectedIds = selectionIds; }

  // Clean up DOM canvas element when layer is removed
  dispose() {
    // Try removing from map viewport first, then fallback to svgContainer
    try {
      const map: any = (this as any).getMap?.();
      const container: HTMLElement | undefined = map?.getViewport?.();
      const el1 = container?.querySelector('#choropleth-canvas');
      if (el1 && el1.parentElement) el1.parentElement.removeChild(el1);
    } catch { }
    try {
      const el2 = this.options.svgContainer.querySelector('#choropleth-canvas');
      if (el2 && el2.parentElement) el2.parentElement.removeChild(el2);
    } catch { }
    try { this.options.svg.select('#choropleth-hitlayer').remove(); } catch { }
  }

  // Provide spatial extent in map projection (EPSG:3857)
  getFeaturesExtent(): Extent | undefined {
    if (!this.geojson || !this.geojson.features?.length) return undefined;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const f of this.geojson.features as GeoJSONFeature[]) {
      for (const [x, y] of coordIter(f)) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return undefined;
    const extent4326: Extent = [minX, minY, maxX, maxY] as any;
    return transformExtent(extent4326, 'EPSG:4326', 'EPSG:3857');
  }
}

function bounds(f: GeoJSONFeature) {
  // very basic lon/lat box
  const coords = coordIter(f);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of coords) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  return [[minX, minY], [maxX, maxY]] as [[number, number], [number, number]];
}

function* coordIter(f: GeoJSONFeature): Iterable<[number, number]> {
  const g = f.geometry;
  if (g.type === 'Polygon') {
    for (const ring of g.coordinates as any[]) for (const c of ring) yield c as [number, number];
  } else if (g.type === 'MultiPolygon') {
    for (const poly of g.coordinates as any[]) for (const ring of poly) for (const c of ring) yield c as [number, number];
  }
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  f: GeoJSONFeature,
  project: (lon: number, lat: number) => [number, number],
  fill: string,
  stroke: string,
  strokeWidth: number,
  opacity: number
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  const g = f.geometry;
  const drawRing = (ring: any[]) => {
    for (let i = 0; i < ring.length; i++) {
      const [x, y] = project(ring[i][0], ring[i][1]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  };
  if (g.type === 'Polygon') {
    for (const ring of g.coordinates as any[]) { drawRing(ring); }
  } else if (g.type === 'MultiPolygon') {
    for (const poly of g.coordinates as any[]) for (const ring of poly) { drawRing(ring); }
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = stroke;
  // Align to half-pixel in CSS pixel space
  ctx.save();
  ctx.translate(0.5, 0.5);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}
