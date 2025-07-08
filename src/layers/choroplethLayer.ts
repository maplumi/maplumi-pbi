import { Layer } from 'ol/layer.js';
import { fromLonLat, toLonLat } from 'ol/proj.js';
import { State } from 'ol/source/Source';
import { ChoroplethLayerOptions, GeoJSONFeature } from '../types/index';
import { geoBounds, geoMercator, geoPath } from 'd3-geo';
import { Extent } from 'ol/extent.js';
import { FrameState } from 'ol/Map';
import rbush from 'rbush';
import { simplify } from '@turf/turf';
import ISelectionId = powerbi.visuals.ISelectionId;

export class ChoroplethLayer extends Layer {

    private svg: any;
    private geojson: any;
    public options: ChoroplethLayerOptions;
    public valueLookup: { [key: string]: number };
    private spatialIndex: any;
    private d3Path: any;
    private selectedIds: powerbi.extensibility.ISelectionId[] = [];
    private isActive: boolean = true;

    constructor(options: ChoroplethLayerOptions) {
        super({ ...options, zIndex: options.zIndex || 10 });

        this.svg = options.svg;
        this.options = options;
        this.geojson = options.geojson;

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
        const center = toLonLat(frameState.viewState.center, frameState.viewState.projection) as [number, number];

        // Clear existing paths
        this.svg.select('#choropleth-group').remove();

        // Set SVG dimensions to match the map viewport
        this.svg
            .attr('width', width)
            .attr('height', height);

        // Calculate the correct scale factor for D3's geoMercator (Web Mercator)
        const scale = 6378137 / resolution;

        // Configure D3's projection to align with OpenLayers
        const d3Projection = geoMercator()
            .scale(scale)
            .center(center)
            .translate([width / 2, height / 2]);

        this.d3Path = geoPath().projection(d3Projection);

        // Create a group element for choropleth
        const choroplethGroup = this.svg.append('g').attr('id', 'choropleth-group');

        // Create a lookup for data points
        const dataPointsLookup = this.options.dataPoints?.reduce((acc, dpoint) => {
            acc[dpoint.pcode] = dpoint;
            return acc;
        }, {} as { [key: string]: any }) || {};

        // Simplify features dynamically based on zoom level
        const tolerance = this.getSimplificationTolerance(resolution);
        
        const options = { tolerance: tolerance, highQuality: false };
        const simplifiedFeatures = simplify(this.geojson, options);

        // Render features
        simplifiedFeatures.features.forEach((feature: GeoJSONFeature) => {
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
                .attr('fill-opacity', (d: any) => {
                    if (this.selectedIds.length === 0) {
                        return this.options.fillOpacity;
                    } else {
                        return this.selectedIds.some(selectedId =>
                            selectedId === dataPoint?.selectionId)
                            ? this.options.fillOpacity
                            : this.options.fillOpacity / 2;
                    }
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
        const choroplethGroupNode = choroplethGroup.node();
        const circles1GroupNode = this.svg.select('#circles-group-1').node();
        const circles2GroupNode = this.svg.select('#circles-group-2').node();

        if (choroplethGroupNode && circles1GroupNode && circles2GroupNode) {
            choroplethGroupNode.parentNode.appendChild(circles1GroupNode);
            choroplethGroupNode.parentNode.appendChild(circles2GroupNode);
        }

        // Append the SVG element to the div
        this.options.svgContainer.appendChild(this.svg.node());

        return this.options.svgContainer;
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

    private simplifyThresholds = {
        high: 0.15,
        high_medium: 0.1,
        medium: 0.05,
        low_medium: 0.02,
        low: 0.005
    };

    private getSimplificationTolerance(resolution: number): number {
        
        // Get the total extent of all features
        const bounds = geoBounds(this.geojson);
        const width = Math.abs(bounds[1][0] - bounds[0][0]);  // longitude span
        const height = Math.abs(bounds[1][1] - bounds[0][1]); // latitude span

        // Calculate feature density factor (smaller area = less simplification needed)
        const area = width * height;
        const densityFactor = Math.min(1, Math.max(0.1, area / 1000));  // Normalize between 0.1 and 1

        // Adjust thresholds based on feature density
        let tolerance: number;
        if (resolution > 7500) {
            tolerance = this.simplifyThresholds.high * densityFactor;
        } else if (resolution > 5000) {
            tolerance = this.simplifyThresholds.high_medium * densityFactor;
        } else if (resolution > 2500) {
            tolerance = this.simplifyThresholds.medium * densityFactor;
        } else if (resolution > 1000) {
            tolerance = this.simplifyThresholds.low_medium * densityFactor;
        } else {
            tolerance = this.simplifyThresholds.low * densityFactor;
        }

        // Add feature count factor (more features = more aggressive simplification)
        const featureCount = this.geojson.features.length;
        const featureCountFactor = Math.min(1.5, Math.max(0.5, featureCount / 1000));

        // Clamp tolerance to avoid oversimplification
        const minTolerance = 0.00001;
        const maxTolerance = 0.01;
        let finalTolerance = tolerance * featureCountFactor;
        finalTolerance = Math.max(minTolerance, Math.min(maxTolerance, finalTolerance));

        // Debug log
        console.log('Simplification:', {
            resolution,
            tolerance,
            featureCount,
            featureCountFactor,
            densityFactor,
            finalTolerance
        });

        return finalTolerance;
    }
}