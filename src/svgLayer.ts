
import { transform, transformExtent } from 'ol/proj.js';
import { Extent, getCenter, getWidth } from 'ol/extent.js';
import { simplify } from '@turf/turf';
import { line, curveLinearClosed } from 'd3';
import { geoBounds } from 'd3-geo';

export class SvgLayer {

    private map: any;
    private d3Svg: any;
    private geojsonData: any;
    private projection: any;
    private loader: any;

    constructor(options) {
        this.map = options.map;
        this.d3Svg = options.d3Svg;
        this.geojsonData = options.geojsonData;
        this.projection = this.map.getView().getProjection();
        this.loader = options.loader;
        this.loader.classList.remove('hidden'); // Show the loader
    }

    // Helper Functions
    private getPixelFromCoordinate(coordinate) {
        return this.map.getPixelFromCoordinate(coordinate);
    }

    private transformCoordinates(coordinates) {
        return coordinates.map(coord =>
            transform(coord, 'EPSG:4326', this.projection)
        );
    }

    private calculateExtent(geojson) {
        if (!geojson || !geojson.features || geojson.features.length === 0) {
            console.log('GeoJSON data must not be empty.');
            return null; // Or handle the empty case appropriately
        }

        const bounds = geoBounds(geojson); // Use d3.geoBounds
        const minX = bounds[0][0];
        const minY = bounds[0][1];
        const maxX = bounds[1][0];
        const maxY = bounds[1][1];

        const extent = [minX, minY, maxX, maxY];
        return transformExtent(extent, 'EPSG:4326', 'EPSG:3857');
    }

    getFeaturesExtent(): Extent {
        return this.calculateExtent(this.geojsonData);
    }

    // Expose SVG for external handlers
    getSvg() {
        return this.d3Svg;
    }

    // Rendering Functions
    renderPoints(features) {

        const group = this.d3Svg.append("g").attr("id", "points")
        features.forEach(feature => {
            const { coordinates } = feature.geometry;
            const pixel = this.getPixelFromCoordinate(
                transform(coordinates, 'EPSG:4326', this.projection)
            );
            if (pixel) {
                group.append("circle")
                    .attr("cx", pixel[0])
                    .attr("cy", pixel[1])
                    .attr("r", 5)
                    .attr("fill", "rgba(255, 0, 0, 0.7)")
                    .attr("stroke", "red")
                    .attr("stroke-width", 1);
            }
        });
        return group;
    }

    renderMultiPoints(features) {
        const group = this.d3Svg.append("g").attr("id", "multipoints")
        features.forEach(feature => {
            const { coordinates } = feature.geometry;
            coordinates.forEach(point => {
                const pixel = this.getPixelFromCoordinate(
                    transform(point, 'EPSG:4326', this.projection)
                );
                if (pixel) {
                    group.append("circle")
                        .attr("cx", pixel[0])
                        .attr("cy", pixel[1])
                        .attr("r", 5)
                        .attr("fill", "rgba(255, 165, 0, 0.7)") // Orange color for MultiPoints
                        .attr("stroke", "orange")
                        .attr("stroke-width", 1);
                }
            });
        });
        return group;
    }

    renderLines(features) {
        const group = this.d3Svg.append("g").attr("id", "lines")
        features.forEach(feature => {
            const { coordinates } = feature.geometry;
            const lineData = this.transformCoordinates(coordinates);
            const linePath = line()
                .x(d => this.getPixelFromCoordinate(d)[0])
                .y(d => this.getPixelFromCoordinate(d)[1]);
            group.append("path")
                .data([lineData])
                .attr("d", linePath)
                .attr("stroke", "blue")
                .attr("stroke-width", 2)
                .attr("fill", "none");
        });
        return group;
    }

    renderMultiLineStrings(features) {
        const group = this.d3Svg.append("g").attr("id", "multilinestrings")
        features.forEach(feature => {
            const { coordinates } = feature.geometry;
            coordinates.forEach(lineString => {
                const lineData = this.transformCoordinates(lineString);
                const linePath = line()
                    .x(d => this.getPixelFromCoordinate(d)[0])
                    .y(d => this.getPixelFromCoordinate(d)[1]);
                group.append("path")
                    .data([lineData])
                    .attr("d", linePath)
                    .attr("stroke", "purple") // Purple color for MultiLineStrings
                    .attr("stroke-width", 2)
                    .attr("fill", "none");
            });
        });
        return group;
    }

    renderPolygons(features) {
        const group = this.d3Svg.append("g").attr("id", "polygons")
        features.forEach(feature => {
            const { type, coordinates } = feature.geometry;
            const polygons = type === "Polygon" ? [coordinates] : coordinates;
            polygons.forEach(polygon => {
                const transformedCoords = this.transformCoordinates(polygon[0]);
                const polygonPath = line()
                    .x(d => this.getPixelFromCoordinate(d)[0])
                    .y(d => this.getPixelFromCoordinate(d)[1])
                    .curve(curveLinearClosed);
                group.append("path")
                    .data([transformedCoords])
                    .attr("d", polygonPath)
                    .attr("fill", "rgba(0, 255, 0, 0.4)")
                    .attr("stroke", "green")
                    .attr("stroke-width", 1);
            });
        });
        return group;
    }



    render() {

        this.d3Svg.selectAll("*").remove(); // Clear previous SVG elements

        const pointFeatures = this.geojsonData.features.filter(feature => feature.geometry.type === "Point");
        const multiPointFeatures = this.geojsonData.features.filter(feature => feature.geometry.type === "MultiPoint");
        const lineFeatures = this.geojsonData.features.filter(feature => feature.geometry.type === "LineString");
        const multiLineStringFeatures = this.geojsonData.features.filter(feature => feature.geometry.type === "MultiLineString");
        const polygonFeatures = this.geojsonData.features.filter(feature => feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon");

        this.renderPoints(pointFeatures);
        this.renderMultiPoints(multiPointFeatures);
        this.renderLines(lineFeatures);
        this.renderMultiLineStrings(multiLineStringFeatures);
        this.renderPolygons(polygonFeatures);


        this.loader.classList.add('hidden'); // Hide the loader after rendering

        this.map.render();

        console.log('Render completed!');
    }
}