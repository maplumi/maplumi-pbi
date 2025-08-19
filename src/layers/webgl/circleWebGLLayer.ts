import WebGLPointsLayer from 'ol/layer/WebGLPoints.js';
import VectorSource from 'ol/source/Vector.js';
import { Feature } from 'ol';
import Point from 'ol/geom/Point.js';
import { fromLonLat, transformExtent } from 'ol/proj.js';
import type { Extent } from 'ol/extent.js';
import { CircleLayerOptions } from '../../types';

export class CircleWebGLLayer extends WebGLPointsLayer<any> {
  public options: CircleLayerOptions;
  private selectedIds: any[] = [];
  private source: VectorSource<any>;

  constructor(options: CircleLayerOptions) {
    const source = new VectorSource();
    // Build features from dataPoints
    const features: Feature[] = (options.dataPoints || []).map((d, i) => {
      return new Feature({
        geometry: new Point(fromLonLat([d.longitude, d.latitude])),
        value1: options.circle1SizeValues?.[i] ?? 0,
        value2: options.circle2SizeValues?.[i] ?? 0,
        total: (options.circle1SizeValues?.[i] ?? 0) + (options.circle2SizeValues?.[i] ?? 0),
        selectionId: d.selectionId,
        tooltip: d.tooltip,
      });
    });
    source.addFeatures(features);

    // Prepare style
    const { circleOptions } = options;
    const fillRGBA = hexToRGBA(circleOptions.color1, circleOptions.layer1Opacity);
    const minVal = options.minCircleSizeValue ?? 0;
    const maxVal = options.maxCircleSizeValue ?? 100;
    const maxRadius = Math.max(circleOptions.minRadius + (options.circleScale || 1), circleOptions.minRadius);
    const valueKey = circleOptions.chartType === 'nested-circle' ? 'value1' : 'total';
    const sizeExpr = (minVal === maxVal)
      ? maxRadius
      : [
          'interpolate',
          ['linear'],
          ['get', valueKey],
          minVal, circleOptions.minRadius,
          maxVal, maxRadius
        ];

    super({
      source,
      style: {
        symbol: {
          symbolType: 'circle',
          size: sizeExpr as any,
          color: [fillRGBA.r, fillRGBA.g, fillRGBA.b, fillRGBA.a],
          strokeColor: hexToRGBAArray(circleOptions.strokeColor, 1),
          strokeWidth: Math.max(1, Math.round(circleOptions.strokeWidth)),
        }
      }
    } as any);

    this.setZIndex(options.zIndex || 20);
    this.options = options;
    this.source = source;
  }

  setSelectedIds(selectionIds: any[]) {
    this.selectedIds = selectionIds;
  }

  dispose() {
    try {
      const map: any = (this as any).getMap?.();
      if (map) map.removeLayer(this);
    } catch {}
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

function hexToRGBA(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1,3), 16) / 255;
  const g = parseInt(hex.slice(3,5), 16) / 255;
  const b = parseInt(hex.slice(5,7), 16) / 255;
  return { r, g, b, a: Math.max(0, Math.min(1, alpha)) };
}

function hexToRGBAArray(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1,3), 16) / 255;
  const g = parseInt(hex.slice(3,5), 16) / 255;
  const b = parseInt(hex.slice(5,7), 16) / 255;
  return [r, g, b, Math.max(0, Math.min(1, alpha))];
}
