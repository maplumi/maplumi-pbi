import WebGLVectorLayer from 'ol/layer/WebGLVector.js';
import VectorSource from 'ol/source/Vector.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import type { Extent } from 'ol/extent.js';
import { transformExtent } from 'ol/proj.js';
import type { ChoroplethLayerOptions, GeoJSONFeature } from '../../types';
import { fromLonLat } from 'ol/proj.js';

export class ChoroplethWebGLLayer extends WebGLVectorLayer<any> {
  public options: ChoroplethLayerOptions;
  private source: VectorSource<any>;
  private hitLayerEl: any;
  private detachListener?: () => void;

  constructor(options: ChoroplethLayerOptions) {
    const source = new VectorSource();
    // Read GeoJSON features and attach per-feature fill color
    const format = new GeoJSON();
    const feats = format.readFeatures(options.geojson as any, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    });
    // Build value lookup
    const valueLookup: Record<string, number> = {};
    const pCodes = options.categoryValues as string[];
    const vals = options.measureValues as number[];
    pCodes.forEach((p, i) => { valueLookup[p] = vals[i]; });

    const toRGB = (c: string): [number, number, number] => {
      if (!c) return [0, 0, 0];
      const s = c.trim();
      if (s.startsWith('#')) {
        const hex = s.slice(1);
        const n = parseInt(hex.length === 3 ? hex.split('').map(x=>x+x).join('') : hex, 16);
        return [(n>>16)&255, (n>>8)&255, n&255];
      }
      const m = s.match(/rgba?\(([^)]+)\)/i);
      if (m) {
        const parts = m[1].split(',').map(p=>parseFloat(p.trim()));
        return [parts[0]||0, parts[1]||0, parts[2]||0];
      }
      return [0,0,0];
    };
    feats.forEach((f: any) => {
      const pcodeKey = options.dataKey;
      const pCode = f.get(pcodeKey);
      const v = valueLookup[pCode];
  const fillStr = (pCode === undefined || v === undefined) ? '#000000' : options.colorScale(v);
  const [r,g,b] = toRGB(fillStr);
  const aBase = Math.max(0, Math.min(1, options.fillOpacity));
  const aDim = aBase * 0.2;
  f.set('fillSelected', [r, g, b, aBase]);
  f.set('fillDim', [r, g, b, aDim]);
  const dp = (options.dataPoints || []).find((x: any) => x.pcode === pCode);
  const selId: any = dp?.selectionId;
  const selKey = (selId && (selId as any).getKey?.()) || (selId as any)?.key || (selId as any)?.toString?.();
  f.set('selectionId', dp?.selectionId);
  f.set('selectionKey', selKey);
      f.set('tooltip', dp?.tooltip);
      f.set('selected', 1);
    });
    source.addFeatures(feats);

    super({
      source,
      style: {
        'fill-color': ['case', ['==', ['get', 'selected'], 1], ['get', 'fillSelected'], ['get', 'fillDim']],
        'stroke-color': options.strokeColor,
        'stroke-width': Math.max(0, Math.round(options.strokeWidth)),
      },
      disableHitDetection: false,
    } as any);

    // Keep polygons below circles but above basemap
    this.setZIndex((options.zIndex ?? 80));
    this.options = options;
    this.source = source;
  }

  // Create invisible SVG hit paths for tooltips and selection
  attachHitLayer(map?: any) {
    try { this.options.svg.select('#choropleth-hitlayer').remove(); } catch {}
  const hit = this.options.svg.append('g').attr('id', 'choropleth-hitlayer');
  try { (hit as any).lower?.(); } catch {}
  hit.style('pointer-events', 'none');
    this.hitLayerEl = hit;
    const features: GeoJSONFeature[] = (this.options.geojson?.features || []) as any;
    const m: any = map || (this as any).getMap?.();
    const buildPath = (f: GeoJSONFeature) => {
      const g: any = f.geometry;
      const segs: string[] = [];
      const toPx = (lon: number, lat: number) => {
        const coord3857 = fromLonLat([lon, lat]);
        const [x, y] = m.getPixelFromCoordinate(coord3857) as [number, number];
        return `${x},${y}`;
      };
      if (g.type === 'Polygon') {
        for (const ring of g.coordinates as any[]) {
          for (let i = 0; i < ring.length; i++) {
            const [lon, lat] = ring[i];
            segs.push(i === 0 ? `M${toPx(lon, lat)}` : `L${toPx(lon, lat)}`);
          }
          segs.push('Z');
        }
      } else if (g.type === 'MultiPolygon') {
        for (const poly of g.coordinates as any[]) {
          for (const ring of poly) {
            for (let i = 0; i < ring.length; i++) {
              const [lon, lat] = ring[i];
              segs.push(i === 0 ? `M${toPx(lon, lat)}` : `L${toPx(lon, lat)}`);
            }
            segs.push('Z');
          }
        }
      }
      return segs.join(' ');
    };
  const update = () => {
      if (!m || !this.hitLayerEl) return;
      const sel = this.hitLayerEl.selectAll('path').data(features as any);
      const joined = sel.join(
        (enter: any) => enter.append('path')
          .style('fill', 'transparent')
          .style('stroke', 'transparent')
          .style('cursor', 'pointer')
          .style('pointer-events', 'all')
          .each((d: any, i: number, nodes: any[]) => {
            const pCode = d.properties?.[this.options.dataKey];
            const dp = (this.options.dataPoints || []).find((x: any) => x.pcode === pCode);
            const selId = dp?.selectionId;
            const tooltip = dp?.tooltip;
            const el = (nodes[i] as any);
            const s = this.options.svg.select(() => el);
            if (tooltip) this.options.tooltipServiceWrapper.addTooltip(
              s as any,
              () => tooltip,
              () => selId,
              true
            );
            s.on('click', (event: MouseEvent) => {
              try { event.stopPropagation(); event.preventDefault(); } catch {}
              const additive = event.ctrlKey || event.metaKey;
              if (!selId) return;
              this.options.selectionManager.select(selId as any, additive)
                .then((ids: any[]) => { this.setSelectedIds(ids as any); });
            });
          }),
        (updateSel: any) => updateSel,
        (exit: any) => exit.remove()
      );
      joined.attr('d', (d: any) => buildPath(d as any));
    };
    update();
    if (m) {
      const cb = () => update();
      m.on('postrender', cb);
      this.detachListener = () => { try { m.un('postrender', cb); } catch {} };
    }
    // Forward wheel events to map view to preserve zoom when hovering hit layer
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

  setSelectedIds(selectionIds: powerbi.extensibility.ISelectionId[]) {
    const ids = Array.isArray(selectionIds) ? selectionIds : [];
    const keys = ids.map((s: any) => (s?.getKey?.()) || s?.key || s?.toString?.());
    const hasSel = keys.length > 0;
    this.source.forEachFeature((f: any) => {
      const key = f.get('selectionKey');
      const isSel = hasSel ? keys.includes(key) : true;
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
  try { this.options.svg.select('#choropleth-hitlayer').remove(); } catch {}
  }

  getFeaturesExtent(): Extent | undefined {
    try {
      const geojson: any = this.options.geojson;
      if (!geojson?.features?.length) return undefined;
      // Compute 4326 bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const f of geojson.features as GeoJSONFeature[]) {
        const coordsIter = coordIter(f);
        for (const [x, y] of coordsIter) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
      if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return undefined;
      const extent4326: Extent = [minX, minY, maxX, maxY] as any;
      return transformExtent(extent4326, 'EPSG:4326', 'EPSG:3857');
    } catch {
      return undefined;
    }
  }
}

function* coordIter(f: GeoJSONFeature): Iterable<[number, number]> {
  const g: any = f.geometry;
  if (g.type === 'Polygon') {
    for (const ring of g.coordinates as any[]) for (const c of ring) yield c as [number,number];
  } else if (g.type === 'MultiPolygon') {
    for (const poly of g.coordinates as any[]) for (const ring of poly) for (const c of ring) yield c as [number,number];
  }
}
