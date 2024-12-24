/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import { OpenLayersVisualFormattingSettingsModel } from "./settings";

import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorTile from "ol/layer/VectorTile";
import VectorSource from "ol/source/Vector";
import VectorTileSource from "ol/source/VectorTile";
import MVT from "ol/format/MVT";
import { createXYZ } from "ol/tilegrid";
import { Feature } from "ol";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import Style from "ol/style/Style";
import Circle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import { WMTS } from "ol/tilegrid";
import TileGrid from "ol/tilegrid/TileGrid"; // Ensure tile grid is properly imported
import Overlay from "ol/Overlay"; // Import Overlay class
import GeoJSON from "ol/format/GeoJSON";
import Geometry from "ol/geom/Geometry";
export class Visual implements IVisual {
    // declaring formatting settings service 
    private formattingSettingsService: FormattingSettingsService;

    private visualFormattingSettingsModel: OpenLayersVisualFormattingSettingsModel; // Define the settings model property

    private map: Map;
    private markerVectorSource: VectorSource;
    private choroplethVectorSource: VectorSource;
    private vectorTileSource: VectorTileSource;
    private vectorTileLayer: VectorTile;
    private container: HTMLElement;
    private basemapLayer: TileLayer;
    private markerVectorLayer: VectorLayer;
    private choroplethVectorLayer: VectorLayer;
    private markerStyle: Style;
    private choroplethStyle: Style;

    private tooltip: Overlay;

    // Variables to store cached data and loading state
    private geojsonDataCache: any = null; // Store the fetched GeoJSON data
    private isDataLoading: boolean = false; // Flag to check if the data is being loaded

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();

        // Initialize the settings model
        this.visualFormattingSettingsModel = new OpenLayersVisualFormattingSettingsModel(); // Initialize settings model        

        this.container = options.element;

        // Ensure the container has proper dimensions
        this.container.style.width = "100%";
        this.container.style.height = "100%";

        this.markerStyle = new Style({
            image: new Circle({
                radius: 6,  // Set the size of the circle
                fill: new Fill({
                    color: '#009edb',  // Set the color of the circle
                }),
                stroke: new Stroke({
                    color: 'ffffff',
                    width: 1,
                }),
            }),
        });

        this.choroplethStyle = new Style({
            stroke: new Stroke({
                color: '#ffffff',
                width: 1
            }),
            fill: new Fill({
                color: '#009edb'
            })
        });

        // Initialize the vector source and layer
        this.markerVectorSource = new VectorSource();
        this.choroplethVectorSource = new VectorSource();

        this.markerVectorLayer = new VectorLayer({
            source: this.markerVectorSource,
            style: this.markerStyle
        });

        this.choroplethVectorLayer = new VectorLayer({
            source: this.choroplethVectorSource,
            style: this.choroplethStyle
        });

        // Initialize the map
        this.map = new Map({
            target: this.container,
            layers: [
                this.basemapLayer = new TileLayer({
                    source: new OSM(), // Default basemap source
                }),
               // this.choroplethVectorLayer, this.markerVectorLayer // Add the vector layer
            ],
            view: new View({
                center: fromLonLat([0, 0]), // Center the map at the origin
                zoom: 19,
            }),
        });

        // Add the tooltip overlay
        this.tooltip = new Overlay({
            element: document.createElement('div'), // Create a div for the tooltip
            positioning: 'bottom-center',
            offset: [0, -10], // Adjust offset as needed
            stopEvent: false // Important: allow map interactions
        });
        this.map.addOverlay(this.tooltip);

        this.map.on('pointermove', (evt) => {
            const pixel = evt.pixel;
            const hit = this.map.forEachFeatureAtPixel(pixel, (feature) => {
                return feature;
            });

            if (hit) {
                const tooltipData = hit.get('tooltip');
                if (tooltipData) {
                    this.tooltip.getElement().textContent = tooltipData; // Set the tooltip content
                    this.tooltip.setPosition(evt.coordinate); // Position the tooltip
                    this.tooltip.getElement().style.display = 'block';
                } else {
                    this.tooltip.getElement().style.display = 'none';
                }
            } else {
                this.tooltip.getElement().style.display = 'none';
            }
        });

    }

    public update(options: VisualUpdateOptions) {

        // Update the visualFormattingSettingsModel based on user changes in the formatting pane
        this.visualFormattingSettingsModel = this.formattingSettingsService.populateFormattingSettingsModel(
            OpenLayersVisualFormattingSettingsModel,
            options.dataViews[0]
        );

        // Retrieve user settings
        const basemapSettings = this.visualFormattingSettingsModel.BasemapVisualCardSettings;
        const markerSettings = this.visualFormattingSettingsModel.MarkerVisualCardSettings;
        const choroplethSettings = this.visualFormattingSettingsModel.ChoroplethVisualCardSettings;

        // Basemap settings
        const selectedBasemap = basemapSettings.selectedBasemap.value.value.toString();

        // Marker styling
        const markerSize = markerSettings.markerSize.value;
        const markerColor = markerSettings.markerColor.value.value;

        // Stroke settings
        const strokeColor = markerSettings.strokeColor.value.value;
        const strokeWidth = markerSettings.strokeWidth.value;

        const selectedCountryISO3Code = choroplethSettings.selectedISO3Code.value;
        const selectedAdminLevel = choroplethSettings.selectedAdminLevel.value.value.toString();
        const selectedColor = choroplethSettings.color.value.value;
        const selectedStrokeColor = choroplethSettings.strokeColor.value.value;
        const selectedStrokeWidth = choroplethSettings.strokeWidth.value;

        console.log("Selected Country ISO3 COde:", selectedCountryISO3Code);
        console.log("Selected Admin Level:", selectedAdminLevel);

        const dataView = options.dataViews[0];
        console.log("Full DataView:", JSON.stringify(dataView, null, 2));

        if (!dataView || !dataView.categorical) {
            console.log("No categorical data found.");
            this.clearMap(); // Clear the map
            return;
        }

        const categorical = dataView.categorical;
        let longitudes: number[] | undefined;
        let latitudes: number[] | undefined;
        let pcodes: string[] | undefined;
        let tooltips: any[] | undefined; // Store tooltip values

        // Find Longitude and Latitude (both in categories)
        if (categorical.categories && categorical.categories.length > 0) { // Check if both categories are present
            const lonCategory = categorical.categories.find(c => c.source.roles && c.source.roles['Longitude']);
            const latCategory = categorical.categories.find(c => c.source.roles && c.source.roles['Latitude']);

            if (lonCategory && latCategory) {
                longitudes = lonCategory.values as number[];
                latitudes = latCategory.values as number[];
                console.log("Longitudes Found:", longitudes);
                console.log("Latitudes Found:", latitudes);

                if (longitudes.length !== latitudes.length) {
                    console.warn("Longitude and Latitude have different lengths.");
                    this.clearMap();
                    //return;
                }
            } else {
                console.warn("Both Longitude and Latitude roles must be assigned.");
                this.clearMap();
                //return;
            }
        } else {
            console.warn("Both Longitude and Latitude roles must be assigned.");
            this.clearMap();
            //return;
        }

        const adminPCodeCategory = categorical.categories.find(c => c.source.roles && c.source.roles['AdminPCode']);

        // Find PCodes (in categories)
        if (adminPCodeCategory) {
            pcodes = adminPCodeCategory.values as string[];
            console.log("AdminPCode Found:", pcodes);

        } else {
            console.warn("PCodes not found.");
            this.clearMap();
            //return;
        }


        // Find Tooltips (in values)
        if (categorical.values && categorical.values.length > 0) {
            tooltips = categorical.values[0].values;
            console.log("Tooltips Found:", tooltips);
        }

        /* Marker/Bubble Map */

        this.markerVectorSource.clear(); // Clear existing features

        if (longitudes && latitudes) { // Check if longitudes and latitudes are defined
            for (let i = 0; i < longitudes.length; i++) {
                const lon = longitudes[i];
                const lat = latitudes[i];

                if (isNaN(lon) || isNaN(lat)) {
                    console.warn(`Skipping invalid point: lon = ${lon}, lat = ${lat}`);
                    continue;
                }

                const point = new Feature({
                    geometry: new Point(fromLonLat([lon, lat])),
                    tooltip: tooltips ? tooltips[i] : undefined // Add tooltip data to the feature
                });

                point.setStyle(new Style({
                    image: new Circle({
                        radius: markerSize,
                        fill: new Fill({ color: markerColor }),
                        stroke: new Stroke({ color: strokeColor, width: strokeWidth }),
                    }),
                }));

                this.markerVectorSource.addFeature(point);
                
            }

            this.markerVectorLayer = new VectorLayer({
                source: this.markerVectorSource,
                style: this.markerStyle
            })

            this.map.addLayer(this.markerVectorLayer);
        }

        /* Chopleth Map */
        this.choroplethVectorSource.clear();
        console.log("Choropleth Vector Source Initial:", this.choroplethVectorSource);

        if (pcodes) {
            // Filter and collect valid PCodes
            const validPCodes = pcodes.filter(pcode => {
                if (!pcode) {
                    console.warn(`Skipping invalid PCode: ${pcode}`);
                    return false;
                }
                return true;
            });

            if (validPCodes.length === 0) {
                console.warn("No valid PCodes found. Exiting.");
                return;
            }

            // Only fetch GeoJSON if not already cached
            if (this.geojsonDataCache) {
                console.log("Using cached GeoJSON data.");
                this.processGeoJSONData(this.geojsonDataCache, validPCodes, selectedAdminLevel, tooltips, selectedColor, selectedStrokeColor, selectedStrokeWidth);
            } else {
                // Show loading indicator since we're fetching data
                //this.showLoadingIndicator();

                // Construct the dynamic GeoJSON API URL
                const geoJsonUrl = `https://codgis.itos.uga.edu/arcgis/rest/services/COD_External/${selectedCountryISO3Code}_pcode/FeatureServer/${selectedAdminLevel}/query?where=0%3D0&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&distance=&units=esriSRUnit_Foot&relationParam=&outFields=*&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&outSR=&gdbVersion=&historicMoment=&returnDistinctValues=false&returnIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&multipatchOption=&resultOffset=&resultRecordCount=&returnTrueCurves=false&sqlFormat=none&f=geojson`;

                // Fetch GeoJSON data from the API
                fetch(geoJsonUrl)
                    .then(response => response.json())
                    .then(geojsonData => {
                        // Cache the GeoJSON data
                        this.geojsonDataCache = geojsonData;

                        // Process the fetched GeoJSON data
                        this.processGeoJSONData(geojsonData, validPCodes, selectedAdminLevel, tooltips, selectedColor, selectedStrokeColor, selectedStrokeWidth);
                    })
                    .catch(error => {
                        console.error("Error fetching GeoJSON data:", error);
                    });
            }
        }

        // Update the map
        this.updateBasemap(selectedBasemap);

        //order layers
        this.choroplethVectorLayer.setZIndex(1); // Lower zIndex (below)
        this.markerVectorLayer.setZIndex(2); // Higher zIndex (above)

        this.updateChoropleth(selectedColor, selectedStrokeColor, selectedStrokeWidth);
        this.updateMarkers(markerSize, markerColor, strokeColor, strokeWidth);        

        this.fitMapToFeatures(); // Call the fit function

        this.map.updateSize();
    }

    // Show loading indicator
    private showLoadingIndicator() {
        document.getElementById('loadingIndicator')!.style.display = 'block'; // Show loading indicator (Assume a div with this ID exists)
    }

    // Hide loading indicator
    private hideLoadingIndicator() {
        document.getElementById('loadingIndicator')!.style.display = 'none'; // Hide loading indicator
    }

    // Function to process the GeoJSON data
    private processGeoJSONData(geojsonData: any, validPCodes: string[], selectedAdminLevel: string, tooltips: any[], selectedColor, selectedStrokeColor, selectedStrokeWidth): void {
        // Create a vector source from the fetched GeoJSON data
        console.log("GeoJSON data retrieved:", geojsonData);

        let pcodeKey = `ADM${selectedAdminLevel}_PCODE`; // Use the appropriate key based on the admin level

        // Filter features based on some condition, e.g., ADM2_PCODE
        const filteredFeatures = geojsonData.features.filter(feature => {
            const featurePCode = feature.properties[pcodeKey]; // Example filter condition
            return validPCodes.includes(featurePCode); // Keep features that match valid PCodes
        });

        console.log("GeoJSON data filoterer:", filteredFeatures);

        // Create a vector source with the filtered features
        this.choroplethVectorSource = new VectorSource({
            format: new GeoJSON(),
            features: new GeoJSON().readFeatures({
                type: "FeatureCollection",
                features: filteredFeatures // Only use the filtered features
            }, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            })
        });

        this.choroplethStyle = new Style({  

            stroke: new Stroke({
                color: selectedStrokeColor,
                width: selectedStrokeWidth
            }),
            fill: new Fill({
                color: selectedColor
            })
        });

        // Create a vector layer using the vector source
        this.choroplethVectorLayer = new VectorLayer({
            source: this.choroplethVectorSource,
            style:  (feature) => { //using arrow function to bind this
                // Check if the feature's ADM2_PCODE (or equivalent) matches any valid PCode
                const featurePCode = feature.get(pcodeKey);
                if (validPCodes.includes(featurePCode)) {
                    return this.choroplethStyle;
                } else {
                    // Return null to skip rendering this feature
                    return null;
                }
            }
        });

        this.map.addLayer(this.choroplethVectorLayer);

        // Fit map view to the extent of the loaded GeoJSON data
        // const extent = this.choroplethVectorSource.getExtent();
        // console.log("Extent:", extent);
        // this.map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 1000 });

        // Hide the loading indicator once the data is processed and rendered
        //this.hideLoadingIndicator();
    }

    private updateBasemap(selectedBasemap: string): void {

        if (!this.basemapLayer) {
            console.error("Basemap layer is not initialized.");
            return;
        }

        switch (selectedBasemap) {
            case "openstreetmap":
                this.basemapLayer.setSource(new OSM());
                break;
            case "mapbox":
                this.basemapLayer.setSource(new XYZ({
                    url: "https://api.mapbox.com/styles/v1/ocha-rosea-1/cm2lidma900jq01r27rkxflo6/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1Ijoib2NoYS1yb3NlYS0xIiwiYSI6ImNtMWhmYndqZDBnbmYyanM1dG41djh5eDkifQ.HT2WOi-53Jm88DA8rJySSA", // Replace with your Mapbox URL
                    attributions: '© <a href="https://www.mapbox.com/">Mapbox, OCHA</a>',
                }));
                break;
            case "esri":
                this.basemapLayer.setSource(new XYZ({
                    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", // Esri World Imagery URL
                    attributions: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                }));
                break;
            default:
                this.basemapLayer.setSource(new OSM()); // Fallback to OpenStreetMap
        }

        console.log(`Basemap updated to: ${selectedBasemap}`);
    }

    private updateMarkers(
        size: number,
        color: string,
        strokeColor: string,
        strokeWidth: number
    ): void {
        if (!this.map) {
            console.error("Map is not initialized.");
            return;
        }

        // Assuming markers are represented as vector layers or similar
        // Apply size, color, and stroke updates to markers here
        console.log(`Updating markers with size: ${size}, color: ${color}, stroke: ${strokeColor}, strokeWidth: ${strokeWidth}`);

        // Example logic to apply marker updates:
        // Update marker styles using the provided parameters.
        this.markerStyle = new Style({
            image: new Circle({
                radius: size,  // Set the size of the circle
                fill: new Fill({
                    color: color,  // Set the color of the circle
                }),
                stroke: new Stroke({
                    color: strokeColor,
                    width: strokeWidth,
                }),
            }),
        });
    }

    private updateChoropleth(
        color: string,
        strokeColor: string,
        strokeWidth: number
    ): void {
        if (!this.map) {
            console.error("Map is not initialized.");
            return;
        }

        // Example logic to apply marker updates:
        // Update marker styles using the provided parameters.
        this.choroplethStyle = new Style({
            fill: new Fill({
                color: color,  // Set the color of the circle
            }),
            stroke: new Stroke({
                color: strokeColor,
                width: strokeWidth,
            }),
        });

    }


    private clearMap() {
        this.choroplethVectorSource.clear();
        this.markerVectorSource.clear();
        this.map.updateSize();
    }

    private fitMapToFeatures() {
        if (this.markerVectorSource.getFeatures().length > 0) {
            this.map.getView().fit(this.markerVectorSource.getExtent(), { padding: [50, 50, 50, 50], duration: 1000 });
        }
        else if (this.choroplethVectorSource.getFeatures().length > 0) {
            this.map.getView().fit(this.choroplethVectorSource.getExtent(), { padding: [50, 50, 50, 50], duration: 1000 });
        }
        else {
            console.warn("No features to fit the view to.");
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.visualFormattingSettingsModel);
    }

    public destroy(): void {
        this.map.setTarget(null);
    }
}
