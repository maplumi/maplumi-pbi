
import { Layer } from 'ol/layer.js';
import { fromLonLat, toLonLat } from 'ol/proj.js';
import { select } from 'd3-selection';
import { State } from 'ol/source/Source';
import { CircleLayerOptions } from './types';
import { geoBounds, geoMercator, geoPath } from 'd3-geo';
import { getCenter, getWidth } from 'ol/extent.js';
import { FrameState } from 'ol/Map';


export class CanvasLayer extends Layer {

    private svg: any;
    private features: any;

    constructor(options: CircleLayerOptions) {
        super(options);

        // Create GeoJSON features from longitudes and latitudes
        this.features = options.longitudes.map((lon, index) => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [lon, options.latitudes[index]], // Construct Point feature
            },
            properties: {} // add additional properties here e.g Id for tracking selections
        }));

        this.svg = options.svg; 

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

        // Use d3.geoBounds() to calculate the bounds of all features
        const bounds = geoBounds({
            type: "FeatureCollection",
            features: this.features // Pass features directly to geoBounds
        });

        // Calculate scale and resolution based on bounds and pixel size
        const pixelBounds = d3Path.bounds({
            type: "FeatureCollection",
            features: this.features // Pass features for bounds calculation
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

        // Clear the previous SVG content before appending new paths
        this.svg.selectAll('*').remove(); // Clear all existing elements

        // Dynamically append paths for each feature
        this.svg.attr('width', width);
        this.svg.attr('height', height);

        // Select all paths (or append if they don't exist)
        this.svg.selectAll('path')
            .data(this.features) // Bind data to path elements
            .join('path') // Use .join() to append or update paths
            .attr('d', function (d) {
                console.log('Feature Geometry:', d.geometry); // Log geometry to check it
                const pathData = d3Path(d); // Generate the 'd' attribute for each feature
                console.log('Generated Path Data:', pathData); // Log the generated path data
                return pathData; // Return the 'd' attribute value
            })
            .attr('fill', 'none') // Example styling, modify as needed
            .attr('stroke', 'black'); // Example styling, modify as needed

        return this.svg.node();
    }
}
