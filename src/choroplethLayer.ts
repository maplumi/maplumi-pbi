
import { Layer } from 'ol/layer.js';
import { fromLonLat, toLonLat } from 'ol/proj.js';
import { State } from 'ol/source/Source';
import { ChoroplethLayerOptions, GeoJSONFeature } from './types';
import { geoBounds, geoMercator, geoPath } from 'd3-geo';
import { Extent } from 'ol/extent.js';
import { FrameState } from 'ol/Map';
import rbush from 'rbush';


export class ChoroplethLayer extends Layer {
    
    private svg: any;
    private geojson: any;
    public options: ChoroplethLayerOptions;
    public valueLookup: { [key: string]: number };
    private spatialIndex: any;
    private d3Path: any;

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

        //console.log('geojson',this.geojson);

    }

    getSourceState(): State {
        return 'ready';
    }

    render(frameState: FrameState) {

        const width = frameState.size[0]; // Map viewport width
        const height = frameState.size[1]; // Map viewport height
        const resolution = frameState.viewState.resolution; // Meters per pixel
        const center  = toLonLat(frameState.viewState.center, frameState.viewState.projection) as [number, number]; // Map center in [lon, lat]

        // Clear existing paths
        this.svg.select('#choropleth-group').remove();

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

        this.d3Path = geoPath().projection(d3Projection);

        // Create a group element for circles
        const choroplethGroup = this.svg.append('g').attr('id', 'choropleth-group');

        // Render features directly from GeoJSON (EPSG:4326)        

        this.geojson.features.forEach((feature: GeoJSONFeature) => {

            const pCode = feature.properties[this.options.dataKey];
            const value = this.valueLookup[pCode];
            const fillColor = this.options.colorScale(value);

            choroplethGroup.append('path')
                .datum(feature)
                .attr('d', this.d3Path)
                .attr('stroke', this.options.strokeColor )
                .attr('stroke-width', this.options.strokeWidth)
                .attr('fill', fillColor )
                .attr('fill-opacity', this.options.fillOpacity);
        });

        // Manually reorder to ensure circles are on top
        const choroplethGroupNode = choroplethGroup.node();
        const circlesGroupNode = this.svg.select('#circles-group').node();

        if (choroplethGroupNode && circlesGroupNode) {
            choroplethGroupNode.parentNode.appendChild(circlesGroupNode);
        }
        // Append the SVG element to the div
        this.options.svgContainer.appendChild(this.svg.node());

        //this.loader.classList.add('hidden'); // Hide loader

        return this.options.svgContainer;
    }

    getSpatialIndex() {
        return this.spatialIndex;
    }

    getd3Path() {   
        return this.d3Path;
    }

    // Expose SVG for external handlers
    getSvg() {
        return this.svg;
    }

    // Get the spatial extent of the features (circle or choropleth)
    getFeaturesExtent(): Extent {

         // Compute geographic bounds with D3
         const bounds = geoBounds(this.geojson); // [ [minLon, minLat], [maxLon, maxLat] ]   EPSG:4326      
 
         // Convert bounds to EPSG:3857
         const minCoords = fromLonLat(bounds[0], 'EPSG:3857'); // Convert [minLon, minLat]
         const maxCoords = fromLonLat(bounds[1], 'EPSG:3857'); // Convert [maxLon, maxLat]
         const extent = [...minCoords, ...maxCoords]; // [minX, minY, maxX, maxY]
        
        return extent;

    }

    

}