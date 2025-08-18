import { Layer } from 'ol/layer.js';
import { fromLonLat } from 'ol/proj.js';
import { State } from 'ol/source/Source';
import { ChoroplethLayerOptions, GeoJSONFeature } from '../types/index';
import { geoBounds, geoPath } from 'd3-geo';
import { Extent } from 'ol/extent.js';
import { FrameState } from 'ol/Map';
import { DomIds } from "../constants/strings";
import rbush from 'rbush';
import { topology } from 'topojson-server';
import { feature as topoFeature } from 'topojson-client';
import { presimplify, simplify as topoSimplify, quantile as topoQuantile } from 'topojson-simplify';
import ISelectionId = powerbi.visuals.ISelectionId;
import { createWebMercatorProjection } from "../utils/map";
import { reorderForCirclesAboveChoropleth, selectionOpacity, setSvgSize } from "../utils/graphics";

export class ChoroplethLayer extends Layer {

    private svg: any;
    private geojson: any;
    public options: ChoroplethLayerOptions;
    public valueLookup: { [key: string]: number };
    private spatialIndex: any;
    private d3Path: any;
    private selectedIds: powerbi.extensibility.ISelectionId[] = [];
    private isActive: boolean = true;
    private simplifiedCache: Map<string, any>;
    private topo: any;
    private topoPresimplified: any;
    private topoThresholds: { coarse: number; low: number; medium: number; high: number; max: number };
    private simplificationStrength: number = 50; // 0-100

    constructor(options: ChoroplethLayerOptions) {
        super({ ...options, zIndex: options.zIndex || 10 });

        this.svg = options.svg;
        this.options = options;
        this.geojson = options.geojson;
        if (typeof options.simplificationStrength === 'number') {
            this.simplificationStrength = Math.max(0, Math.min(100, options.simplificationStrength));
        }

        // Create a lookup table for measure values
        this.valueLookup = {};
        const pCodes = options.categoryValues as string[];
        const colorValues = options.measureValues as number[];
        pCodes.forEach((pCode, index) => {
            this.valueLookup[pCode] = colorValues[index];
        });

        // Build the spatial index
        this.spatialIndex = new rbush();
        const features = this.geojson.features.map((feature: GeoJSONFeature) => {
            const bounds = geoBounds(feature);
            return {
                minX: bounds[0][0],
                minY: bounds[0][1],
                maxX: bounds[1][0],
                maxY: bounds[1][1],
                feature: feature
            };
        });
        this.spatialIndex.load(features);

        this.d3Path = null;
        this.simplifiedCache = new Map();

        // Build a topology from GeoJSON once, with quantization to reduce precision (and size) safely for web rendering
        try {
            // Wrap the collection under a named object; we'll refer to it as 'layer'
            this.topo = topology({ layer: this.geojson });
            // Compute triangle areas for effective topology-preserving simplify
            this.topoPresimplified = presimplify(this.topo);
            this.recomputeThresholds();
        } catch (e) {
            // Fallback: leave topo undefined; will render original GeoJSON
            this.topo = undefined;
            this.topoPresimplified = undefined;
            this.topoThresholds = { coarse: 0, low: 0, medium: 0, high: 0, max: 0 };
        }

        this.changed();
    }

    getSourceState(): State {
        return 'ready';
    }

    setActive(active: boolean) {
        this.isActive = active;
        this.changed();
    }

    render(frameState: FrameState) {
        if (!this.isActive) return;

    const width = frameState.size[0];
    const height = frameState.size[1];
    const resolution = frameState.viewState.resolution;

        // Clear existing paths
    this.svg.select(`#${DomIds.ChoroplethGroup}`).remove();

        // Set SVG dimensions to match the map viewport
    setSvgSize(this.svg, width, height);

        // Calculate the correct scale factor for D3's geoMercator (Web Mercator)
    // Configure D3's projection to align with OpenLayers
    const d3Projection = createWebMercatorProjection(frameState, width, height);

        this.d3Path = geoPath().projection(d3Projection);

        // Create a group element for choropleth
    const choroplethGroup = this.svg.append('g').attr('id', DomIds.ChoroplethGroup);

        // Create a lookup for data points
        const dataPointsLookup = this.options.dataPoints?.reduce((acc, dpoint) => {
            acc[dpoint.pcode] = dpoint;
            return acc;
        }, {} as { [key: string]: any }) || {};

    // Simplify features dynamically based on zoom level with topology-preserving LODs
    const simplified = this.getSimplifiedGeoJsonForResolution(resolution);

        // Render features
    simplified.features.forEach((feature: GeoJSONFeature) => {
            const pCode = feature.properties[this.options.dataKey];
            const valueRaw = this.valueLookup[pCode];
            
            // Use valueRaw as-is for colorScale (do not force to number if unique value mode)
            const fillColor = (pCode === undefined || valueRaw === undefined)
                ? 'transparent'
                : this.options.colorScale(valueRaw);
            
            //console.log('Layer render:', { pCode, value: valueRaw, fillColor, type: typeof valueRaw });
            
            const dataPoint = dataPointsLookup[pCode];

            const path = choroplethGroup.append('path')
                .datum(feature)
                .style('cursor', 'pointer')
                .style('pointer-events', 'all')
                .attr('d', this.d3Path)
                .attr('stroke', this.options.strokeColor)
                .attr('stroke-width', this.options.strokeWidth)
                .attr('fill', fillColor)
                .attr('fill-opacity', (d: any) => selectionOpacity(this.selectedIds, dataPoint?.selectionId, this.options.fillOpacity));

            // Add tooltip
            if (dataPoint?.tooltip) {
                this.options.tooltipServiceWrapper.addTooltip(
                    path,
                    () => dataPoint.tooltip,
                    () => dataPoint.selectionId,
                    true
                );
            }

            // Add click handler for selection
            path.on('click', (event: MouseEvent) => {
                if (!dataPoint?.selectionId) return;

                const nativeEvent = event;
                this.options.selectionManager.select(dataPoint.selectionId, nativeEvent.ctrlKey || nativeEvent.metaKey)
                    .then((selectedIds: ISelectionId[]) => {
                        this.selectedIds = selectedIds;
                        this.changed();
                    });
            });
        });

        // Re-order layers to ensure circles are on top
    reorderForCirclesAboveChoropleth(this.svg);

        // Append the SVG element to the div
        this.options.svgContainer.appendChild(this.svg.node());

        return this.options.svgContainer;
    }

    // Retrieve a simplified GeoJSON based on resolution using TopoJSON thresholds; fallback to original if topology unavailable
    private getSimplifiedGeoJsonForResolution(resolution: number) {
        if (!this.topoPresimplified) {
            return this.geojson;
        }

        const level = this.getLodLevel(resolution);
        const cacheKey = `lod:${level}`;
        const cached = this.simplifiedCache.get(cacheKey);
        if (cached) return cached;

    const threshold = this.getThresholdForLevel(level);
    const simplifiedTopo = topoSimplify(this.topoPresimplified, threshold);
    const geo = topoFeature(simplifiedTopo, simplifiedTopo.objects.layer);

        // Cap cache size
        const MAX_ENTRIES = 8;
        if (this.simplifiedCache.size >= MAX_ENTRIES) {
            const oldestKey = this.simplifiedCache.keys().next().value;
            this.simplifiedCache.delete(oldestKey);
        }
        this.simplifiedCache.set(cacheKey, geo);
        return geo;
    }

    private getLodLevel(resolution: number): 'coarse' | 'low' | 'medium' | 'high' | 'max' {
        if (resolution > 7500) return 'coarse';
        if (resolution > 5000) return 'low';
        if (resolution > 2500) return 'medium';
        if (resolution > 1000) return 'high';
        return 'max';
    }

    private getThresholdForLevel(level: 'coarse' | 'low' | 'medium' | 'high' | 'max'): number {
        return this.topoThresholds[level] || 0;
    }

    // Map user strength (0-100) to shifting quantiles per LOD; higher strength => larger threshold => more simplification
    private recomputeThresholds() {
        const s = this.simplificationStrength / 100; // 0..1
        // Base quantiles for LODs, then lerp towards 0.95 (aggressive) as s increases
        const base = { coarse: 0.8, low: 0.6, medium: 0.4, high: 0.2, max: 0.0 };
        const target = 0.95; // very aggressive
        const q = {
            coarse: base.coarse + (target - base.coarse) * s,
            low:    base.low    + (target - base.low)    * s,
            medium: base.medium + (target - base.medium) * s,
            high:   base.high   + (target - base.high)   * s,
            max:    base.max    + (target - base.max)    * s,
        };
        this.topoThresholds = {
            coarse: topoQuantile(this.topoPresimplified, q.coarse),
            low:    topoQuantile(this.topoPresimplified, q.low),
            medium: topoQuantile(this.topoPresimplified, q.medium),
            high:   topoQuantile(this.topoPresimplified, q.high),
            max:    topoQuantile(this.topoPresimplified, q.max),
        };
    }

    getSpatialIndex() {
        return this.spatialIndex;
    }

    getd3Path() {
        return this.d3Path;
    }

    getSvg() {
        return this.svg;
    }

    getFeaturesExtent(): Extent {
        const bounds = geoBounds(this.geojson);
        const minCoords = fromLonLat(bounds[0], 'EPSG:3857');
        const maxCoords = fromLonLat(bounds[1], 'EPSG:3857');
        const extent = [...minCoords, ...maxCoords];
        return extent;
    }

    setSelectedIds(selectionIds: powerbi.extensibility.ISelectionId[]) {
        this.selectedIds = selectionIds;
    }

    // Old numeric tolerance-based simplify removed in favor of topology-preserving LODs
}