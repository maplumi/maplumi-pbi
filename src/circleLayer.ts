
import { Layer } from 'ol/layer.js';
import { fromLonLat, toLonLat } from 'ol/proj.js';
import { select } from 'd3-selection';
import { State } from 'ol/source/Source';
import { CircleLayerOptions, ChoroplethLayerOptions } from './types';
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
        this.options = options;

        this.features = options.longitudes.map((lon, index) => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [lon, options.latitudes[index]], // Construct Point feature
            },
            properties: {}, // Add additional properties here
        }));

        //console.log('Circle Features:', this.features);

    }

    getSourceState(): State {
        return 'ready';
    }

    render(frameState: FrameState) {

        const width = frameState.size[0];
        const height = frameState.size[1];
        const projection = frameState.viewState.projection;

        const d3Projection = geoMercator().scale(1).translate([0, 0]);
        let d3Path = geoPath().projection(d3Projection);

        this.svg.selectAll('*').remove();
        this.svg.attr('width', width);
        this.svg.attr('height', height);

        // Use d3.geoBounds() to calculate the bounds of all features
        const bounds = geoBounds({
            type: 'FeatureCollection',
            features: this.features,
        });

        // Calculate scale and resolution based on bounds and pixel size
        const pixelBounds = d3Path.bounds({
            type: 'FeatureCollection',
            features: this.features,
        });

        const pixelBoundsWidth = pixelBounds[1][0] - pixelBounds[0][0];
        const pixelBoundsHeight = pixelBounds[1][1] - pixelBounds[0][1];

        const geoBoundsLeftBottom = fromLonLat(bounds[0], projection);
        const geoBoundsRightTop = fromLonLat(bounds[1], projection);
        let geoBoundsWidth = geoBoundsRightTop[0] - geoBoundsLeftBottom[0];
        if (geoBoundsWidth < 0) {
            geoBoundsWidth += getWidth(projection.getExtent());
        }
        const geoBoundsHeight = geoBoundsRightTop[1] - geoBoundsLeftBottom[1];

        const widthResolution = geoBoundsWidth / pixelBoundsWidth;
        const heightResolution = geoBoundsHeight / pixelBoundsHeight;
        const r = Math.max(widthResolution, heightResolution);
        const scale = r / frameState.viewState.resolution;

        const centerCoordinate = toLonLat(getCenter(frameState.extent), projection);
        const center: [number, number] = [centerCoordinate[0], centerCoordinate[1]];
        const angle = (-frameState.viewState.rotation * 180) / Math.PI;

        d3Projection
            .scale(scale)
            .center(center)
            .translate([width / 2, height / 2])
            .angle(angle);

        d3Path = d3Path.projection(d3Projection);

        const { circleSizeValues = [], circleOptions } = this.options as CircleLayerOptions;
        const { minRadius, color, strokeColor, strokeWidth } = circleOptions;

        const minSize = Math.min(...circleSizeValues);
        const maxSize = Math.max(...circleSizeValues);
        const circleScale = (value: number) =>
            minRadius +
            ((value - minSize) / (maxSize - minSize)) * (circleOptions.maxRadius - minRadius);

        // Create a group element for circles
        const circlesGroup = this.svg.append('g').attr('id', 'circles-group'); ;

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

        // Ensure circles group is always on top AFTER rendering both groups
        // this.svg.selectAll('g').sort((a: any, b: any) => {
        //     return a.childNodes[0].tagName === 'circle' ? 1 : -1;
        // });

        // Append the SVG element to the div
        this.options.svgContainer.appendChild(this.svg.node());

        // Return the div element
        return this.options.svgContainer;


        //return this.svg.node();

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