
import { Layer } from 'ol/layer.js';
import { fromLonLat, toLonLat } from 'ol/proj.js';
import { select } from 'd3-selection';
import { State } from 'ol/source/Source';
import { ChoroplethLayerOptions } from './types';
import { geoBounds, geoMercator, geoPath, GeoPermissibleObjects } from 'd3-geo';
import { Extent, getCenter, getWidth } from 'ol/extent.js';
import { FrameState } from 'ol/Map';
import { transformExtent } from 'ol/proj.js';
import { FeatureLike } from 'ol/Feature';
import { simplify } from '@turf/turf';

export class ChoroplethLayer extends Layer {

    
    private svg: any;
    //private loader: any;
    private geojson: any;
    public options: ChoroplethLayerOptions;

    constructor(options: ChoroplethLayerOptions) {

        super({ ...options, zIndex: options.zIndex || 10 });

        this.svg = options.svg;
        //this.loader=options.loader;
        this.options = options;

        this.geojson = options.geojson; 

        console.log('geojson',this.geojson);

        //this.loader.classList.remove('hidden'); // Show the loader

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

        const d3Path = geoPath().projection(d3Projection);

        // Create a group element for circles
        const choroplethGroup = this.svg.append('g').attr('id', 'choropleth-group');

        // Render features directly from GeoJSON (EPSG:4326)
        this.geojson.features.forEach((feature) => {

            choroplethGroup.append('path')
                .datum(feature)
                .attr('d', d3Path)
                .attr('stroke', 'blue')
                .attr('stroke-width', 1)
                .attr('fill', 'none');
        });

        // Append the SVG element to the div
        this.options.svgContainer.appendChild(this.svg.node());

        //this.loader.classList.add('hidden'); // Hide loader

        return this.options.svgContainer;
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