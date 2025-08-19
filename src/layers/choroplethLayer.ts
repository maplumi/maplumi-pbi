import { Layer } from 'ol/layer.js';
import { fromLonLat } from 'ol/proj.js';
import { State } from 'ol/source/Source';
import { ChoroplethLayerOptions, GeoJSONFeature } from '../types/index';
import { geoBounds, geoPath } from 'd3-geo';
import { Extent } from 'ol/extent.js';
import { FrameState } from 'ol/Map';
import { DomIds } from "../constants/strings";
import rbush from 'rbush';
// Topology-based simplification removed to reduce bundle deps and errors
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
    private simplificationStrength: number = 50; // 0-100

    // Normalizer for robust joins (case-insensitive, trimmed)
    private normalize(v: any): string {
        if (v === null || v === undefined) return "";
        if (typeof v === "number") return String(v);
        return String(v).trim().toUpperCase();
    }

    constructor(options: ChoroplethLayerOptions) {
        super({ ...options, zIndex: options.zIndex || 10 });

        this.svg = options.svg;
        this.options = options;
        this.geojson = options.geojson;
        if (typeof options.simplificationStrength === 'number') {
            this.simplificationStrength = Math.max(0, Math.min(100, options.simplificationStrength));
        }

        // Normalizer for robust joins (case-insensitive, trimmed)
        // Create a lookup table for measure values using normalized keys
        this.valueLookup = {};
        const pCodes = options.categoryValues as string[];
        const colorValues = options.measureValues as number[];
        pCodes.forEach((pCode, index) => {
            const k = this.normalize(pCode);
            if (k !== "") {
                this.valueLookup[k] = colorValues[index];
            }
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

        // Create a lookup for data points using normalized keys
        const dataPointsLookup = this.options.dataPoints?.reduce((acc, dpoint) => {
            const k = this.normalize(dpoint.pcode);
            if (k !== "") acc[k] = dpoint;
            return acc;
        }, {} as { [key: string]: any }) || {};

    // Simplification currently disabled; use original geojson
    const simplified = this.getSimplifiedGeoJsonForResolution(resolution);

        const greyOut = !!this.options.greyOutUnmatchedBoundaries;
        // Render features
    simplified.features.forEach((feature: GeoJSONFeature) => {
            const pCode = feature.properties[this.options.dataKey];
            const key = this.normalize(pCode);
            if (key === "") {
                return; // Never render features with an empty join key
            }
            const dataPoint = dataPointsLookup[key];
            const valueRaw = this.valueLookup[key];

            // Decide rendering for unmatched
            if ((dataPoint === undefined || valueRaw === undefined) && !greyOut) {
                return; // hide unmatched when toggle is off
            }

            // Color: either data-driven or grey for unmatched
            const fillColor = (dataPoint === undefined || valueRaw === undefined)
                ? (this.options.greyOutUnmatchedBoundariesColor || '#BDBDBD')
                : this.options.colorScale(valueRaw);

            const path = choroplethGroup.append('path')
                .datum(feature)
                .style('cursor', 'pointer')
                .style('pointer-events', 'all')
                .attr('d', this.d3Path)
                .attr('stroke', this.options.strokeColor)
                .attr('stroke-width', this.options.strokeWidth)
                .attr('fill', fillColor)
                .attr('fill-opacity', (d: any) => {
                    const base = selectionOpacity(this.selectedIds, dataPoint?.selectionId, this.options.fillOpacity);
                    const greyOpacity = (this.options.greyOutUnmatchedBoundariesOpacity ?? 0.35);
                    return (dataPoint === undefined || valueRaw === undefined) ? Math.min(base, greyOpacity) : base;
                });

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

    // Retrieve a simplified GeoJSON based on resolution; currently returns original (no simplification)
    private getSimplifiedGeoJsonForResolution(resolution: number) {
        // Simplification is currently disabled (no topojson-simplify). Return original.
        return this.geojson;
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
        const features = (this.geojson?.features || []) as GeoJSONFeature[];
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let matched = 0;

        for (const f of features) {
            const key = this.normalize(f?.properties ? f.properties[this.options.dataKey] : undefined);
            if (key === "") continue;
            const hasValue = Object.prototype.hasOwnProperty.call(this.valueLookup, key);
            if (!hasValue) continue;
            const b = geoBounds(f);
            if (!b || !Array.isArray(b) || b.length !== 2) continue;
            const [lo, hi] = b as [number[], number[]];
            if (!Array.isArray(lo) || !Array.isArray(hi)) continue;
            minX = Math.min(minX, lo[0]);
            minY = Math.min(minY, lo[1]);
            maxX = Math.max(maxX, hi[0]);
            maxY = Math.max(maxY, hi[1]);
            matched++;
        }

        // If we found matched features, use that extent; otherwise fall back to full collection extent
        if (matched > 0 && isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY)) {
            const minCoords = fromLonLat([minX, minY], 'EPSG:3857');
            const maxCoords = fromLonLat([maxX, maxY], 'EPSG:3857');
            return [...minCoords, ...maxCoords] as Extent;
        }

        const bounds = geoBounds(this.geojson);
        const minCoords = fromLonLat(bounds[0], 'EPSG:3857');
        const maxCoords = fromLonLat(bounds[1], 'EPSG:3857');
        return [...minCoords, ...maxCoords] as Extent;
    }

    setSelectedIds(selectionIds: powerbi.extensibility.ISelectionId[]) {
        this.selectedIds = selectionIds;
    }

    // Old numeric tolerance-based simplify removed in favor of topology-preserving LODs
}