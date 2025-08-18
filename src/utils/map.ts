import { toLonLat } from 'ol/proj.js';
import { geoMercator } from 'd3-geo';
import type { FrameState } from 'ol/Map';

// Create a D3 Web Mercator projection aligned with OpenLayers frame state
export function createWebMercatorProjection(frameState: FrameState, width: number, height: number) {
    const resolution = frameState.viewState.resolution;
    const center = toLonLat(frameState.viewState.center, frameState.viewState.projection) as [number, number];
    const scale = 6378137 / resolution;
    return geoMercator()
        .scale(scale)
        .center(center)
        .translate([width / 2, height / 2]);
}
