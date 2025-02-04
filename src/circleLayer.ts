
import { Layer } from 'ol/layer.js';
import { fromLonLat, toLonLat } from 'ol/proj.js';
import { select } from 'd3-selection';
import { State } from 'ol/source/Source';
import { CircleLayerOptions, GeoJSONFeature } from './types';
import { geoBounds, geoMercator, geoPath, GeoPermissibleObjects } from 'd3-geo';
import { Extent, getCenter, getWidth } from 'ol/extent.js';
import { FrameState } from 'ol/Map';
import { transformExtent } from 'ol/proj.js';
import { FeatureLike } from 'ol/Feature';
import { simplify } from '@turf/turf';
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

export class CircleLayer extends Layer {

    private svg: any;
    private features: GeoJSONFeature[];
    public options: CircleLayerOptions;

    constructor(options: CircleLayerOptions) {
        super({ ...options, zIndex: options.zIndex || 10 });

        this.svg = options.svg;
        this.options = options;

        this.features = options.dataPoints?.map((d, index) => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [d.longitude, d.latitude],
            },
            properties: {
                tooltip: d.tooltip,
                selectionId: d.selectionId, // Store selection ID
            },
        })) || [];

        this.changed(); // Trigger re-render

    }

    getSourceState(): State {
        return 'ready';
    }

    private isActive: boolean = true; // Add this

    setActive(active: boolean) {
        this.isActive = active;
        this.changed(); // Trigger re-render
    }

    render(frameState: FrameState) {
        if (!this.isActive) return; // Guard clause

        const width = frameState.size[0]; // Map viewport width
        const height = frameState.size[1]; // Map viewport height
        const resolution = frameState.viewState.resolution; // Meters per pixel
        const center = toLonLat(frameState.viewState.center, frameState.viewState.projection) as [number, number]; // Map center in [lon, lat]

        this.options.selectionManager.clear(); // Clear selection on re-render

        // Clear existing paths
        this.svg.select('#circles-group').remove();

        // Set SVG dimensions to match the map viewport
        this.svg
            .attr('width', width)
            .attr('height', height);

        // Calculate the correct scale for D3's geoMercator
        const scale = 6378137 / resolution; // Earth's radius in meters / resolution

        // Configure D3's projection to align with OpenLayers
        const d3Projection = geoMercator()
            .scale(scale)
            .center(center) // Center in [lon, lat]
            .translate([width / 2, height / 2]);

        const { circleSizeValues = [], circleOptions } = this.options as CircleLayerOptions;
        const { minRadius, color, layerOpacity, strokeColor, strokeWidth } = circleOptions;

        const minSize = Math.min(...circleSizeValues);
        const maxSize = Math.max(...circleSizeValues);
        const circleScale = (value: number) => minRadius +
            ((value - minSize) / (maxSize - minSize)) * (circleOptions.maxRadius - minRadius);

        // Create a group element for circles
        const circlesGroup = this.svg.append('g').attr('id', 'circles-group');

        // Append a transparent rectangle that will capture click events.
        // This rectangle should be added as the first child so that it sits behind other elements.
        const clickableRect = this.svg.selectAll('#clickable-bg').data([null]);
        clickableRect.enter()
            .append('rect')
            .attr('id', 'clickable-bg')
            .attr('width', '100%')
            .attr('height', '100%')
            .style('fill', 'transparent')
            // Enable pointer events on this rectangle so that clicks are captured.
            .style('pointer-events', 'all')
            .on('click', (event: MouseEvent) => {
                // Clear selection using the selectionManager.
                this.options.selectionManager.clear().then(() => {
                    // For example, reset circle opacities here.
                    const circlesGroup = this.svg.select('#circles-group');
                    circlesGroup.selectAll('circle')
                        .attr('fill-opacity', this.options.circleOptions.layerOpacity);
                });
            });


        this.features.forEach((feature: GeoJSONFeature, i: number) => {

            if (!feature.geometry || feature.geometry.type !== 'Point') return;

            const [lon, lat] = feature.geometry.coordinates;
            const projected = d3Projection([lon, lat]);

            if (projected) {

                const [x, y] = projected;

                const radius = circleSizeValues[i] !== undefined
                    ? circleScale(circleSizeValues[i])
                    : minRadius;

                // After appending the circle to the group:
                const circle = circlesGroup
                    .append('circle')
                    .attr('cx', x)
                    .attr('cy', y)
                    .attr('r', radius)
                    .attr('fill', color)
                    .attr('fill-opacity', layerOpacity)
                    .attr('stroke', strokeColor)
                    .attr('stroke-width', strokeWidth)
                    .datum(feature.properties.selectionId)
                    .style('cursor', 'pointer')
                    .style('pointer-events', 'all');

                // Attach the tooltip if tooltip data is available
                if (feature.properties.tooltip) {

                    // Use addTooltip with the reload parameter set to true.
                    this.options.tooltipServiceWrapper.addTooltip(
                        circle,
                        () => {
                            return feature.properties.tooltip;
                        },
                        () => feature.properties.selectionId,
                        true  // Forces the tooltip data to reload on every mouse move.
                    );
                }

                // Handle selection on single click

                circle.on('click', (event: MouseEvent) => {
                    const selectionId = feature.properties.selectionId;
                    const nativeEvent = event;

                    this.options.selectionManager
                        .select(selectionId, nativeEvent.ctrlKey || nativeEvent.metaKey)
                        .then((selectedIds) => {
                            // Reset all circles to full opacity
                            circlesGroup.selectAll('circle')
                                .attr('fill-opacity', layerOpacity);

                            if (selectedIds.length > 0) {
                                // Reduce opacity for non-selected circles
                                circlesGroup.selectAll('circle')
                                    .filter(d => !selectedIds.includes(d))
                                    .attr('fill-opacity', 0.4);
                            }
                        });

                    event.stopPropagation();
                });


            }

        });

        // Manually reorder to ensure circles are on top
        const choroplethGroupNode = this.svg.select('#choropleth-group').node();
        const circlesGroupNode = circlesGroup.node();

        if (choroplethGroupNode && circlesGroupNode) {
            choroplethGroupNode.parentNode.appendChild(circlesGroupNode);
        }

        // Append the SVG element to the div
        this.options.svgContainer.appendChild(this.svg.node());

        // Return the div element
        return this.options.svgContainer;

    }

    // Expose SVG for external handlers
    getSvg() {
        return this.svg;
    }

    // Get the spatial extent of the features (circle or choropleth)
    getFeaturesExtent(): Extent {

        // Calculate extent for circle features
        const options = this.options as CircleLayerOptions;
        return this.calculateCirclesExtent(options.longitudes, options.latitudes);

    }

    // Calculate extent for circle features
    private calculateCirclesExtent(longitudes: number[], latitudes: number[]): Extent {
        if (longitudes.length === 0 || latitudes.length === 0) {
            console.warn('Longitude and latitude arrays must not be empty.');
        }

        if (longitudes.length !== latitudes.length) {
            console.warn('Longitude and latitude arrays must have the same length.');
        }

        const minX = Math.min(...longitudes);
        const maxX = Math.max(...longitudes);
        const minY = Math.min(...latitudes);
        const maxY = Math.max(...latitudes);

        const extent = [minX, minY, maxX, maxY];
        return transformExtent(extent, 'EPSG:4326', 'EPSG:3857'); // Transform to map projection
    }

}