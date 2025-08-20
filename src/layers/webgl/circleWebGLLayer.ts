import WebGLVectorLayer from 'ol/layer/WebGLVector.js';
import VectorSource from 'ol/source/Vector.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import { fromLonLat, transformExtent } from 'ol/proj.js';
import type { Extent } from 'ol/extent.js';
import { CircleLayerOptions } from '../../types';

export class CircleWebGLLayer extends WebGLVectorLayer<any> {
  public options: CircleLayerOptions;
  private selectedIds: any[] = [];
  private source: VectorSource<any>;
  private hitLayerEl: any;
  private detachListener?: () => void;

  constructor(options: CircleLayerOptions) {
    const source = new VectorSource();
    // Build features from dataPoints
    const features: Feature[] = (options.dataPoints || []).map((d, i) => {
      const v1 = options.circle1SizeValues?.[i] ?? 0;
      const v2 = options.circle2SizeValues?.[i] ?? 0;
      const total = v1 + v2;
      const selId: any = d.selectionId;
      const selKey = (selId && (selId as any).getKey?.()) || (selId as any)?.key || (selId as any)?.toString?.();
      return new Feature({
        geometry: new Point(fromLonLat([d.longitude, d.latitude])),
        value1: v1,
        value2: v2,
        total,
        selectionId: d.selectionId,
        selectionKey: selKey,
        tooltip: d.tooltip,
  selected: 1,
      });
    });
    source.addFeatures(features);

    // Prepare style
  const { circleOptions } = options;
    const minVal = options.minCircleSizeValue ?? 0;
    const maxVal = options.maxCircleSizeValue ?? 100;
    const valueKey = circleOptions.chartType === 'nested-circle' ? 'value1' : 'total';
    const minR = Math.max(1, circleOptions.minRadius);
    const minR2 = minR * minR;
    const scale = options.circleScale || 1; // area scaling factor
    // Precompute per-feature radius to avoid complex runtime expressions
    if (features && features.length) {
      const maxR = Math.max(minR, circleOptions.maxRadius ?? minR + 1);
      const maxR2 = maxR * maxR;
      for (const f of features) {
        const v = f.get(valueKey) ?? 0;
        let clamped = v;
        if (maxVal !== minVal) {
          if (clamped < minVal) clamped = minVal;
          if (clamped > maxVal) clamped = maxVal;
        }
        const area = minR2 + (clamped - minVal) * scale;
        const r2 = Math.max(minR2, Math.min(area, maxR2));
        const r = Math.sqrt(r2);
        f.set('rad', Math.max(1, Math.round(r)));
      }
    }

  super({
      source,
      declutter: false,
      style: {
        'circle-radius': ['get', 'rad'],
        'circle-fill-color': circleOptions.color1,
        'circle-stroke-color': circleOptions.strokeColor,
        'circle-stroke-width': Math.max(0, Math.round(circleOptions.strokeWidth)),
    'circle-opacity': ['case', ['==', ['get', 'selected'], 1], Math.max(0, Math.min(1, circleOptions.layer1Opacity)), Math.max(0, Math.min(1, circleOptions.layer1Opacity)) * 0.2],
        'circle-rotate-with-view': false,
        'circle-displacement': [0, 0]
      },
    disableHitDetection: true
    } as any);

  // Ensure circles are above any canvas-based layers
  this.setZIndex((options.zIndex ?? 100) + 10);
    this.options = options;
    this.source = source;
  }

  // Called by orchestrator after the layer is added to the map
  attachHitLayer(map?: any) {
    try { this.options.svg.select('#circles-hitlayer').remove(); } catch {}
  const hit = this.options.svg.append('g').attr('id', 'circles-hitlayer');
  try { (hit as any).raise?.(); } catch {}
  hit.style('pointer-events', 'none');
    this.hitLayerEl = hit;
    const feats: any[] = [];
    this.source.forEachFeature(f => feats.push(f));
    const getPixel = (f: any) => {
      const coord = f.getGeometry().getCoordinates(); // already in map projection (3857)
      const m: any = map || (this as any).getMap?.();
      if (!m) return [0, 0];
      return m.getPixelFromCoordinate(coord) as [number, number];
    };
    const updatePositions = () => {
      const m: any = map || (this as any).getMap?.();
      if (!m || !this.hitLayerEl) return;
      const sel = this.hitLayerEl.selectAll('circle').data(feats);
      const joinSel = sel.join((enter: any) => enter.append('circle'))
        // Use a slightly larger hit radius for better hover/click consistency
        .attr('r', (d: any) => Math.max(d.get('rad') || 4, 8))
        .style('fill', 'transparent')
        .style('stroke', 'transparent')
        .style('cursor', 'pointer')
        .style('pointer-events', 'all')
        .each((d: any, i: number, nodes: any[]) => {
          const selId = d.get('selectionId');
          const tooltip = d.get('tooltip');
          const el = (nodes[i] as any);
          const s = this.options.svg.select(() => el);
          // Set initial position for accurate hit-testing before first postrender update
          const [cx, cy] = getPixel(d);
          el.setAttribute('cx', String(cx));
          el.setAttribute('cy', String(cy));
          if (tooltip) this.options.tooltipServiceWrapper.addTooltip(
            s as any,
            () => tooltip,
            () => selId,
            true
          );
          s.on('click', (event: MouseEvent) => {
            try { event.stopPropagation(); event.preventDefault(); } catch {}
            const additive = event.ctrlKey || event.metaKey;
            this.options.selectionManager.select(selId as any, additive)
              .then((ids: any[]) => { this.setSelectedIds(ids as any); });
          });
          // Forward wheel to map view so zoom works when hovering circles
          s.on('wheel', (event: WheelEvent) => {
            try { event.preventDefault(); event.stopPropagation(); } catch {}
            const mm: any = map || (this as any).getMap?.();
            const view = mm?.getView?.();
            if (!view) return;
            const curr = view.getZoom?.() || 0;
            const step = event.deltaY > 0 ? -0.5 : 0.5;
            view.animate({ zoom: curr + step, duration: 80 });
          });
        });
      this.hitLayerEl.selectAll('circle').each((d: any, i: number, nodes: any[]) => {
        const [x, y] = getPixel(d);
        (nodes[i] as any).setAttribute('cx', x);
        (nodes[i] as any).setAttribute('cy', y);
      });
    };
    // Initial and on map render
    updatePositions();
    const m: any = map || (this as any).getMap?.();
    if (m) {
      const cb = () => updatePositions();
      m.on('postrender', cb);
      this.detachListener = () => { try { m.un('postrender', cb); } catch {} };
    }
    // Forward wheel to map view to allow zoom when hovering circles
    try {
      const node = (this.hitLayerEl as any).node?.() as HTMLElement;
      if (node) {
        node.addEventListener('wheel', (e: WheelEvent) => {
          const mm: any = map || (this as any).getMap?.();
          const view = mm?.getView?.();
          if (!view) return;
          e.preventDefault(); e.stopPropagation();
          const curr = view.getZoom?.() || 0;
          const step = e.deltaY > 0 ? -0.5 : 0.5;
          view.animate({ zoom: curr + step, duration: 80 });
        }, { passive: false });
      }
    } catch {}
  }

  setSelectedIds(selectionIds: any[]) {
    this.selectedIds = Array.isArray(selectionIds) ? selectionIds : [];
    const keys = this.selectedIds.map((s: any) => (s?.getKey?.()) || s?.key || s?.toString?.());
    const hasSelection = keys.length > 0;
    // Update per-feature selected flag; if no selection, everyone selected (no dim)
    this.source.forEachFeature((f: any) => {
      const key = f.get('selectionKey');
      const isSel = hasSelection ? keys.includes(key) : true;
      f.set('selected', isSel ? 1 : 0);
    });
    try { (this as any).changed?.(); } catch {}
  }

  dispose() {
    try {
      const map: any = (this as any).getMap?.();
      if (map) map.removeLayer(this);
    } catch {}
  try { if (this.detachListener) this.detachListener(); } catch {}
  try { this.options.svg.select('#circles-hitlayer').remove(); } catch {}
  }

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

// no-op helpers
