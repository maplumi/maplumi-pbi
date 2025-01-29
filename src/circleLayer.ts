
import { Layer } from 'ol/layer.js';
import { fromLonLat, toLonLat } from 'ol/proj.js';
import { select } from 'd3-selection';
import { State } from 'ol/source/Source';
import { CircleLayerOptions } from './types';
import { geoBounds, geoMercator, geoPath, GeoPermissibleObjects } from 'd3-geo';
import { Extent, getCenter, getWidth } from 'ol/extent.js';
import { FrameState } from 'ol/Map';
import { transformExtent } from 'ol/proj.js';
import { FeatureLike } from 'ol/Feature';
import { simplify } from '@turf/turf';

export class CircleLayer extends Layer {

    private svg: any;
    private features: any;
    public options: CircleLayerOptions;

    constructor(options: CircleLayerOptions) {
        super({ ...options, zIndex: options.zIndex || 10 });

        this.svg = options.svg;
        //this.loader = options.loader;
        this.options = options;

        this.features = options.longitudes.map((lon, index) => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [lon, options.latitudes[index]], // Construct Point feature
            },
            properties: {}, // Add additional properties here
        }));

    }

    getSourceState(): State {
        return 'ready';
    }

    render(frameState: FrameState) {

        const width = frameState.size[0]; // Map viewport width
        const height = frameState.size[1]; // Map viewport height
        const resolution = frameState.viewState.resolution; // Meters per pixel
        const center = toLonLat(frameState.viewState.center, frameState.viewState.projection) as [number, number]; // Map center in [lon, lat]

        // Clear existing paths
        this.svg.selectAll('*').remove();

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
        const { minRadius, color, strokeColor, strokeWidth } = circleOptions;

        const minSize = Math.min(...circleSizeValues);
        const maxSize = Math.max(...circleSizeValues);
        const circleScale = (value: number) =>
            minRadius +
            ((value - minSize) / (maxSize - minSize)) * (circleOptions.maxRadius - minRadius);

        // Create a group element for circles
        const circlesGroup = this.svg.append('g').attr('id', 'circles-group');

        this.features.forEach((feature, i) => {

            if (!feature.geometry || feature.geometry.type !== 'Point') return;

            const [lon, lat] = feature.geometry.coordinates;
            const projected = d3Projection([lon, lat]);

            if (projected) {

                const [x, y] = projected;

                const radius = circleSizeValues[i] !== undefined
                    ? circleScale(circleSizeValues[i])
                    : minRadius;

                circlesGroup
                    .append('circle')
                    .attr('cx', x)
                    .attr('cy', y)
                    .attr('r', radius)
                    .attr('fill', color)
                    .attr('stroke', strokeColor)
                    .attr('stroke-width', strokeWidth);
            }
        });

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