import { Layer } from 'ol/layer.js';
import { FrameState } from 'ol/Map';
import { State } from 'ol/source/Source';
import type { Extent } from 'ol/extent.js';
import { transformExtent } from 'ol/proj.js';
import { CircleLayerOptions } from '../../types';
import { getCanvasAndCtx, mercatorProjector } from './canvasUtils';
import { selectionOpacity } from '../../utils/graphics';
import * as d3 from 'd3';
import { createWebMercatorProjection } from '../../utils/map';

export class CircleCanvasLayer extends Layer {
  public options: CircleLayerOptions;
  private selectedIds: powerbi.extensibility.ISelectionId[] = [];
  private isActive = true;

  constructor(options: CircleLayerOptions) {
    super({ ...options, zIndex: options.zIndex || 10 });
    this.options = options;
    this.changed();
  }

  getSourceState(): State { return 'ready'; }
  setActive(active: boolean) { this.isActive = active; this.changed(); }

  render(frameState: FrameState) {
    if (!this.isActive) return;
    const width = frameState.size[0];
    const height = frameState.size[1];
  const { canvas, ctx, dpr } = getCanvasAndCtx(this.options.svgContainer, width, height, 'circles-canvas');
  // Ensure circles render above choropleth
  canvas.style.zIndex = '20';
  // Clear in device pixels and scale to CSS pixels for drawing
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';

  const project = mercatorProjector(frameState, width, height);
  const { longitudes = [], latitudes = [], combinedCircleSizeValues = [], circle1SizeValues = [], circle2SizeValues = [], circleOptions, minCircleSizeValue = 0, maxCircleSizeValue = 100, circleScale: scaleFactor = 1 } = this.options;

    const allRelevantValues = [...combinedCircleSizeValues];
    for (let i = 0; i < Math.min(circle1SizeValues.length, circle2SizeValues.length); i++) {
      if (circle1SizeValues[i] !== undefined && circle2SizeValues[i] !== undefined) {
        allRelevantValues.push(circle1SizeValues[i] + circle2SizeValues[i]);
      }
    }

    const circleScale = (v: number) => {
      const minR2 = circleOptions.minRadius * circleOptions.minRadius;
      const clamped = Math.max(minCircleSizeValue, Math.min(v, maxCircleSizeValue as number));
      const r = Math.sqrt(minR2 + (clamped - minCircleSizeValue) * scaleFactor);
      return Math.max(r, circleOptions.minRadius);
    };

  // Remove any previous hit overlay and recreate
  this.options.svg.select('#circles-hitlayer').remove();
  const hitLayer = this.options.svg.append('g').attr('id', 'circles-hitlayer');
  hitLayer.style('pointer-events', 'all');
  const d3Projection = createWebMercatorProjection(frameState, width, height);

  for (let i = 0; i < longitudes.length; i++) {
      const [x, y] = project(longitudes[i], latitudes[i]);
      const r1 = circle1SizeValues[i] !== undefined ? circleScale(circle1SizeValues[i]) : circleOptions.minRadius;
      const r2 = circle2SizeValues[i] !== undefined ? circleScale(circle2SizeValues[i]) : circleOptions.minRadius;

      const chartType = circleOptions.chartType;
      if (chartType === 'donut-chart' && circle2SizeValues.length > 0 && circle1SizeValues[i] !== undefined && circle2SizeValues[i] !== undefined) {
        const v1 = circle1SizeValues[i];
        const v2 = circle2SizeValues[i];
        const total = v1 + v2;
        const outer = circleScale(total);
        const inner = Math.max(outer * 0.6, 1);
        // arc1
        const selId = this.options.dataPoints?.[i]?.selectionId as any;
        drawArc(ctx, x, y, inner, outer, 0, (v1/total) * 2*Math.PI, applyOpacity(circleOptions.color1, selectionOpacity(this.selectedIds, selId, circleOptions.layer1Opacity)), circleOptions.strokeColor, circleOptions.strokeWidth);
        // arc2
        drawArc(ctx, x, y, inner, outer, (v1/total) * 2*Math.PI, 2*Math.PI, applyOpacity(circleOptions.color2, selectionOpacity(this.selectedIds, selId, circleOptions.layer2Opacity)), circleOptions.strokeColor, circleOptions.strokeWidth);

        // Invisible hit target using SVG circle at outer radius
        const [hx, hy] = d3Projection([longitudes[i], latitudes[i]]) as [number, number];
        const hit = hitLayer.append('circle')
          .attr('cx', hx)
          .attr('cy', hy)
          .attr('r', outer)
          .style('fill', 'transparent')
          .style('stroke', 'transparent')
          .style('cursor', 'pointer')
          .style('pointer-events', 'all')
          .datum(this.options.dataPoints?.[i]?.selectionId);
        if (this.options.dataPoints?.[i]?.tooltip) {
          this.options.tooltipServiceWrapper.addTooltip(
            hit as any,
            () => this.options.dataPoints?.[i]?.tooltip,
            () => this.options.dataPoints?.[i]?.selectionId,
            true
          );
        }
        hit.on('click', (event: MouseEvent) => {
          const selectionId = this.options.dataPoints?.[i]?.selectionId;
          const nativeEvent = event;
          this.options.selectionManager.select(selectionId as any, nativeEvent.ctrlKey || nativeEvent.metaKey)
            .then((selectedIds: powerbi.extensibility.ISelectionId[]) => { this.selectedIds = selectedIds; this.changed(); });
        });
      } else if (chartType === 'pie-chart' && circle2SizeValues.length > 0 && circle1SizeValues[i] !== undefined && circle2SizeValues[i] !== undefined) {
        const v1 = circle1SizeValues[i];
        const v2 = circle2SizeValues[i];
        const total = v1 + v2;
        const outer = circleScale(total);
  // arc1
  const selId2 = this.options.dataPoints?.[i]?.selectionId as any;
  drawArc(ctx, x, y, 0, outer, 0, (v1/total) * 2*Math.PI, applyOpacity(circleOptions.color1, selectionOpacity(this.selectedIds, selId2, circleOptions.layer1Opacity)), circleOptions.strokeColor, circleOptions.strokeWidth);
        // arc2
  drawArc(ctx, x, y, 0, outer, (v1/total) * 2*Math.PI, 2*Math.PI, applyOpacity(circleOptions.color2, selectionOpacity(this.selectedIds, selId2, circleOptions.layer2Opacity)), circleOptions.strokeColor, circleOptions.strokeWidth);

        const [hx, hy] = d3Projection([longitudes[i], latitudes[i]]) as [number, number];
        const hit = hitLayer.append('circle')
          .attr('cx', hx)
          .attr('cy', hy)
          .attr('r', outer)
          .style('fill', 'transparent')
          .style('stroke', 'transparent')
          .style('cursor', 'pointer')
          .style('pointer-events', 'all')
          .datum(this.options.dataPoints?.[i]?.selectionId);
        if (this.options.dataPoints?.[i]?.tooltip) {
          this.options.tooltipServiceWrapper.addTooltip(
            hit as any,
            () => this.options.dataPoints?.[i]?.tooltip,
            () => this.options.dataPoints?.[i]?.selectionId,
            true
          );
        }
        hit.on('click', (event: MouseEvent) => {
          const selectionId = this.options.dataPoints?.[i]?.selectionId;
          const nativeEvent = event;
          this.options.selectionManager.select(selectionId as any, nativeEvent.ctrlKey || nativeEvent.metaKey)
            .then((selectedIds: powerbi.extensibility.ISelectionId[]) => { this.selectedIds = selectedIds; this.changed(); });
        });
      } else {
        // circle 1
        ctx.beginPath();
        ctx.arc(x, y, r1, 0, 2*Math.PI);
  const selId3 = this.options.dataPoints?.[i]?.selectionId as any;
  ctx.fillStyle = applyOpacity(circleOptions.color1, selectionOpacity(this.selectedIds, selId3, circleOptions.layer1Opacity));
  ctx.strokeStyle = circleOptions.strokeColor;
  ctx.lineWidth = Math.round(circleOptions.strokeWidth);
  ctx.fill();
  strokeAligned(ctx);

        if (circle2SizeValues.length > 0) {
          ctx.beginPath();
          ctx.arc(x, y, r2, 0, 2*Math.PI);
          ctx.fillStyle = applyOpacity(circleOptions.color2, selectionOpacity(this.selectedIds, selId3, circleOptions.layer2Opacity));
          ctx.strokeStyle = circleOptions.strokeColor;
          ctx.lineWidth = Math.round(circleOptions.strokeWidth);
          ctx.fill();
          strokeAligned(ctx);
        }

        const [hx, hy] = d3Projection([longitudes[i], latitudes[i]]) as [number, number];
        const hit = hitLayer.append('circle')
          .attr('cx', hx)
          .attr('cy', hy)
          .attr('r', Math.max(r1, r2))
          .style('fill', 'transparent')
          .style('stroke', 'transparent')
          .style('cursor', 'pointer')
          .style('pointer-events', 'all')
          .datum(this.options.dataPoints?.[i]?.selectionId);
        if (this.options.dataPoints?.[i]?.tooltip) {
          this.options.tooltipServiceWrapper.addTooltip(
            hit as any,
            () => this.options.dataPoints?.[i]?.tooltip,
            () => this.options.dataPoints?.[i]?.selectionId,
            true
          );
        }
        hit.on('click', (event: MouseEvent) => {
          const selectionId = this.options.dataPoints?.[i]?.selectionId;
          const nativeEvent = event;
          this.options.selectionManager.select(selectionId as any, nativeEvent.ctrlKey || nativeEvent.metaKey)
            .then((selectedIds: powerbi.extensibility.ISelectionId[]) => { this.selectedIds = selectedIds; this.changed(); });
        });
      }

      // Tooltip hookup: use invisible DOM hit-target overlay by syncing dataPoints to pixel rects (optional improvement)
      // For now, rely on Power BI tooltip wrapper with coordinate anchoring via SVG fallback if needed.
    }

    return this.options.svgContainer;
  }

  setSelectedIds(selectionIds: powerbi.extensibility.ISelectionId[]) { this.selectedIds = selectionIds; }

  // Clean up DOM canvas element when layer is removed
  dispose() {
    const el = this.options.svgContainer.querySelector('#circles-canvas');
    if (el && el.parentElement) el.parentElement.removeChild(el);
  // Remove hit overlay group
  try { this.options.svg.select('#circles-hitlayer').remove(); } catch {}
  }

  // Provide spatial extent in map projection so orchestrators can fit the view
  getFeaturesExtent(): Extent | undefined {
    const longs = this.options.longitudes || [];
    const lats = this.options.latitudes || [];
    if (!longs.length || !lats.length) return undefined;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < Math.min(longs.length, lats.length); i++) {
      const x = longs[i];
      const y = lats[i];
      if (x == null || y == null || Number.isNaN(x) || Number.isNaN(y)) continue;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return undefined;
    const extent4326: Extent = [minX, minY, maxX, maxY] as any;
    return transformExtent(extent4326, 'EPSG:4326', 'EPSG:3857');
  }
}

function applyOpacity(hex: string, alpha: number) {
  // hex like #rrggbb
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawArc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
  fillStyle: string,
  strokeStyle: string,
  lineWidth: number
) {
  ctx.beginPath();
  // Match d3-arc orientation: angles measured clockwise from 12 o'clock
  const a0 = startAngle - Math.PI / 2;
  const a1 = endAngle - Math.PI / 2;
  // For a pie slice (innerRadius = 0), draw from center -> outer start -> outer arc -> back to center
  if (innerRadius <= 0) {
    const sx = x + outerRadius * Math.cos(a0);
    const sy = y + outerRadius * Math.sin(a0);
    ctx.moveTo(x, y);
    ctx.lineTo(sx, sy);
    ctx.arc(x, y, outerRadius, a0, a1, false);
    ctx.lineTo(x, y);
  } else {
    // Donut slice: outer arc then inner arc in reverse to create the ring segment
    ctx.arc(x, y, outerRadius, a0, a1, false);
    ctx.arc(x, y, innerRadius, a1, a0, true);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  strokeAligned(ctx);
}

function strokeAligned(ctx: CanvasRenderingContext2D) {
  ctx.save();
  // Half-pixel alignment in CSS pixel space (post-DPR scaling)
  ctx.translate(0.5, 0.5);
  ctx.stroke();
  ctx.restore();
}
