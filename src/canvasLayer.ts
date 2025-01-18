
import { Layer } from 'ol/layer.js';
import { fromLonLat, toLonLat } from 'ol/proj.js';
import { select } from 'd3-selection';
import { State } from 'ol/source/Source';
import { CircleLayerOptions } from './types';
import { geoBounds, geoMercator, geoPath } from 'd3-geo';
import { Extent, getCenter, getWidth } from 'ol/extent.js';
import { FrameState } from 'ol/Map';
import { transformExtent } from 'ol/proj.js';


export class CanvasLayer extends Layer {

    private svg: any;
    private features: any;
    public options: CircleLayerOptions;

    constructor(options: CircleLayerOptions) {

        super({ ...options, zIndex: options.zIndex || 10 });

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
        this.options = options;

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

        this.svg.selectAll('*').remove();

        // Dynamically append paths for each feature
        this.svg.attr('width', width);
        this.svg.attr('height', height);

        // Check if sizeValues are provided and valid for rendering circles
        const sizeValues = this.options.circleSizeValues || [];
        const hasSizeValues = sizeValues.length > 0;

        if (hasSizeValues) {

            // Render circles for point features
            const { minRadius, color, strokeColor, strokeWidth } = this.options.circleOptions;

            // Calculate scale for circle sizes
            const minSize = Math.min(...sizeValues);
            const maxSize = Math.max(...sizeValues);
            const circleScale = (value: number) => minRadius + ((value - minSize) / (maxSize - minSize)) * (this.options.circleOptions.maxRadius - minRadius);

            this.features.forEach((feature, i) => {

                if (feature.geometry.type === "Point") {

                    const [lon, lat] = feature.geometry.coordinates;
                    const projected = d3Projection([lon, lat]);

                    if (projected) {
                        const [x, y] = projected;
                        const radius = circleScale(sizeValues[i]);

                        this.svg.append('circle')
                            .attr('cx', x)
                            .attr('cy', y)
                            .attr('r', radius)
                            .attr('fill', color)
                            .attr('stroke', strokeColor)
                            .attr('stroke-width', strokeWidth)
                            .attr('data-id', feature.properties.id) // Attach unique ID
                            .attr('data-size-value', sizeValues[i]) // Attach size value
                            .attr('data-index', i); // Attach index;
                        //.style('pointer-events', 'none')
                        // Disable pointer events for circles
                    }
                }
            });

        } else {

            // Render other features (lines, polygons, etc.) using path elements
            // this.svg.selectAll('path')
            //     .data(this.features)
            //     .join('path')
            //     .attr('d', (d) => d3Path(d)) // Generate the path using d3.geoPath
            //     .attr('fill', this.options.circleOptions.color) // Set fill color from circleOptions
            //     .attr('stroke', this.options.circleOptions.strokeColor) // Set stroke color from circleOptions
            //     .attr('stroke-width', this.options.circleOptions.strokeWidth)
            //     .style('pointer-events', 'none'); // Set stroke width

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
                .attr('stroke', 'black')
                .attr('fill', this.options.circleOptions.color)
                .attr('stroke', this.options.circleOptions.strokeColor)
                .attr('stroke-width', this.options.circleOptions.strokeWidth)

                .style('pointer-events', 'none'); // Disbale pointer events  ; // Example styling, modify as needed
        }

        return this.svg.node();
    }


    // Expose SVG for external handlers
    getSvg() {
        return this.svg;
    }

    getCirclesExtent() {
        return this.calculateCirclesExtent(this.options.longitudes, this.options.latitudes);
    }

    private calculateCirclesExtent(longitudes: number[], latitudes: number[]): Extent {
        if (longitudes.length === 0 || latitudes.length === 0) {
            throw new Error("Longitude and latitude arrays must not be empty.");
        }
    
        if (longitudes.length !== latitudes.length) {
            throw new Error("Longitude and latitude arrays must have the same length.");
        }
    
        const minX = Math.min(...longitudes);
        const maxX = Math.max(...longitudes);
        const minY = Math.min(...latitudes);
        const maxY = Math.max(...latitudes);
    
        const extent = [minX, minY, maxX, maxY];
    
        const transformedExtent = transformExtent(extent, 'EPSG:4326', 'EPSG:3857');
    
        return transformedExtent;
    }

}
