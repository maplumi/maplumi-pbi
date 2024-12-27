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
import * as chroma from "chroma-js"; // Import chroma module
import Overlay from "ol/Overlay"; // Import Overlay class
import GeoJSON from "ol/format/GeoJSON";
import Geometry from "ol/geom/Geometry";
export class Visual implements IVisual {
    // declaring formatting settings service 
    private formattingSettingsService: FormattingSettingsService;

    private visualFormattingSettingsModel: OpenLayersVisualFormattingSettingsModel; // Define the settings model property

    private map: Map;
    private circleVectorSource: VectorSource;
    private choroplethVectorSource: VectorSource;
    private container: HTMLElement;
    private basemapLayer: TileLayer;
    private circleVectorLayer: VectorLayer;
    private choroplethVectorLayer: VectorLayer;
    private circleStyle: Style;
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

        this.circleStyle = new Style({
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
        this.circleVectorSource = new VectorSource();
        this.choroplethVectorSource = new VectorSource();

        this.circleVectorLayer = new VectorLayer({
            source: this.circleVectorSource,
            style: this.circleStyle
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
                    source: new OSM() // Default basemap source
                })
                // this.choroplethVectorLayer, this.circleVectorLayer // Add the vector layer
            ],
            view: new View({
                projection: 'EPSG:3857',
                center: fromLonLat([0, 0]), // Center the map at the origin
                zoom: 2
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

        console.log("Visual initialized.");

    }

    public update(options: VisualUpdateOptions) {

        // Update the visualFormattingSettingsModel based on user changes in the formatting pane
        this.visualFormattingSettingsModel = this.formattingSettingsService.populateFormattingSettingsModel(
            OpenLayersVisualFormattingSettingsModel,
            options.dataViews[0]
        );

        // Retrieve user settings
        const basemapSettings = this.visualFormattingSettingsModel.BasemapVisualCardSettings;
        const circleSettings = this.visualFormattingSettingsModel.ProportionalCirclesVisualCardSettings;
        const choroplethSettings = this.visualFormattingSettingsModel.ChoroplethVisualCardSettings;
        const choroplethDisplaySettings = choroplethSettings.choroplethDisplaySettingsGroup;
        const choroplethLocationSettings = choroplethSettings.pcodesAdminLocationSettingsGroup;

        // Basemap settings
        const selectedBasemap = basemapSettings.selectedBasemap.value.value.toString();

        // Proportional CIrcle settings 
        const circleOptions = {
            layerControl: circleSettings.topLevelSlice.value,
            color: circleSettings.proportionalCirclesColor.value.value,
            minRadius: circleSettings.proportionalCirclesMinimumRadius.value,
            maxRadius: circleSettings.proportionalCirclesMaximumRadius.value,
            defaultSize: circleSettings.proportionalCirclesSize.value,
            strokeColor: circleSettings.proportionalCirclesStrokeColor.value.value,
            strokeWidth: circleSettings.proportionalCirclesStrokeWidth.value,
            layerOpacity: circleSettings.proportionalCirclesLayerOpacity.value / 100
        };
        console.log("circleOptions:", circleOptions);

        //choropleth settings        
        const choroplethOptions = {
            layerControl: choroplethSettings.topLevelSlice.value,
            countryISO3Code: choroplethLocationSettings.selectedISO3Code.value,
            adminLevel: choroplethLocationSettings.selectedAdminLevel.value.value.toString(),
            midColor: choroplethDisplaySettings.midColor.value.value,
            classes: choroplethDisplaySettings.numClasses.value,
            classificationMethod: choroplethDisplaySettings.classificationMethod.value.value.toString(),
            minColor: choroplethDisplaySettings.minColor.value.value,
            maxColor: choroplethDisplaySettings.maxColor.value.value,
            strokeColor: choroplethDisplaySettings.strokeColor.value.value,
            strokeWidth: choroplethDisplaySettings.strokeWidth.value,
            layerOpacity: choroplethDisplaySettings.layerOpacity.value / 100
        };
        console.log("choroplethOptions:", choroplethOptions);

        const dataView = options.dataViews[0];

        console.log("Full DataView:", JSON.stringify(dataView, null, 2));

        if (!dataView || !dataView.categorical) {
            console.log("No categorical data found.");
            this.clearMap(this.circleVectorSource);
            this.clearMap(this.choroplethVectorSource);
            return;
        }

        // Update the basemap
        this.updateBasemap(selectedBasemap);

        const categorical = dataView.categorical;

        let tooltips: any[] | undefined;

        if (categorical.values && categorical.values.length > 0) {
            /* Tooltip values */
            const tooltipMeasure = categorical?.values?.find(c => c.source?.roles && c.source.roles['Tooltips']);
            if (tooltipMeasure) {
                tooltips = tooltipMeasure.values;
                console.log("Tooltips Found:", tooltips);
            } else {
                console.log("Tooltips not found.");
            }

        } else {
            console.log("No values found.");
        }


        //render circle layer
        if (circleOptions.layerControl) {

            console.log("Rendering Circle Layer");

            let longitudes: number[] | undefined;
            let latitudes: number[] | undefined;
            let circleSizeValues: number[] | undefined;
            let minCircleSizeValue: number | undefined;
            let maxCircleSizeValue: number | undefined;
            let circleScale: number | undefined;

            const lonCategory = categorical?.categories?.find(c => c.source?.roles && c.source.roles['Longitude']);
            const latCategory = categorical?.categories?.find(c => c.source?.roles && c.source.roles['Latitude']);
            console.log("Longitude Category:", lonCategory);
            console.log("Latitude Category:", latCategory);

            if (lonCategory && latCategory) {
                longitudes = lonCategory.values as number[];
                latitudes = latCategory.values as number[];

                if (longitudes.length !== latitudes.length) {
                    console.warn("Longitude and Latitude have different lengths.");
                    this.clearMap(this.circleVectorSource);
                    //return;
                } else {

                    // Check for Circle Size Measure
                    if (categorical.values && categorical.values.length > 0) {

                        const CircleSizeMeasure = categorical?.values?.find(c => c.source?.roles && c.source.roles['Size']);

                        if (CircleSizeMeasure) {

                            circleSizeValues = CircleSizeMeasure.values as number[];
                            console.log("Circle Size Values Found:", circleSizeValues);

                            minCircleSizeValue = Math.min(...circleSizeValues);
                            maxCircleSizeValue = Math.max(...circleSizeValues);

                            circleScale = (circleOptions.maxRadius - circleOptions.minRadius) / (maxCircleSizeValue - minCircleSizeValue);

                            //render proportional circles
                            this.circleVectorSource.clear(); // Clear existing features
                            if (longitudes && latitudes) { // Check if longitudes and latitudes are defined

                                for (let i = 0; i < longitudes.length; i++) {

                                    const lon = longitudes[i];
                                    const lat = latitudes[i];

                                    const size = circleSizeValues[i];
                                    const radius = circleOptions.minRadius + (size - minCircleSizeValue) * circleScale;

                                    if (isNaN(lon) || isNaN(lat)) {
                                        console.warn(`Skipping invalid point: lon = ${lon}, lat = ${lat}`);
                                        continue;
                                    }

                                    const point = new Feature({
                                        geometry: new Point(fromLonLat([lon, lat])),
                                        size: size, // Add size data to the feature
                                        tooltip: tooltips ? tooltips[i] : undefined // Add tooltip data to the feature
                                    });

                                    point.setStyle(new Style({
                                        image: new Circle({
                                            radius: radius,
                                            fill: new Fill({ color: circleOptions.color }),
                                            stroke: new Stroke({ color: circleOptions.strokeColor, width: circleOptions.strokeWidth }),
                                        }),
                                    }));

                                    this.circleVectorSource.addFeature(point);

                                }

                                this.circleVectorLayer.setStyle((feature: Feature) => {
                                    const size = feature.get('size');
                                    const radius = circleOptions.minRadius + (size - minCircleSizeValue) * circleScale;

                                    return new Style({
                                        image: new Circle({
                                            radius: radius,
                                            fill: new Fill({
                                                color: circleOptions.color
                                            }),
                                            stroke: new Stroke({
                                                color: circleOptions.strokeColor,
                                                width: circleOptions.strokeWidth
                                            })
                                        })
                                    });
                                });

                                this.circleVectorLayer.setOpacity(circleOptions.layerOpacity);

                                this.map.addLayer(this.circleVectorLayer);

                                this.fitMapToFeatures()
                            }


                        }
                    } else {
                        //render circles with default size  
                        console.log("Circle Size Values not found. Rendering default circles.");
                        this.circleVectorSource.clear(); // Clear existing features
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
                                        radius: circleOptions.defaultSize,
                                        fill: new Fill({ color: circleOptions.color }),
                                        stroke: new Stroke({ color: circleOptions.strokeColor, width: circleOptions.strokeWidth }),
                                    }),
                                }));

                                this.circleVectorSource.addFeature(point);
                            }

                            this.circleStyle = new Style({
                                image: new Circle({
                                    radius: circleOptions.defaultSize,
                                    fill: new Fill({ color: circleOptions.color }),
                                    stroke: new Stroke({ color: circleOptions.strokeColor, width: circleOptions.strokeWidth }),
                                }),
                            });

                            this.circleVectorLayer = new VectorLayer({
                                source: this.circleVectorSource,
                                style: this.circleStyle,
                                opacity: circleOptions.layerOpacity
                            });

                            this.map.addLayer(this.circleVectorLayer);

                            this.fitMapToFeatures()
                        }

                    }
                }

            } else {
                console.warn("Both Longitude and Latitude roles must be assigned.");
                this.clearMap(this.circleVectorSource);
            }
        }


        //render choropleth layer
        if (choroplethOptions.layerControl) {

            let pcodes: string[] | undefined;
            let colorValues: any[] | undefined;
            let minColorValue: any | undefined;
            let maxColorValue: any | undefined;
            let classBreaks: any[] | undefined;
            let colorScale: any | undefined;

            // Find PCodes (in categories)
            const adminPCodeCategory = categorical.categories.find(c => c.source?.roles && c.source.roles['AdminPCode']);
            if (adminPCodeCategory) {
                pcodes = adminPCodeCategory.values as string[];
                //console.log("AdminPCode Found:", pcodes);

                if (categorical.values && categorical.values.length > 0) {
                    /* Choropleth Color values */
                    const colorMeasure = categorical?.values?.find(c => c.source?.roles && c.source.roles['Color']);

                    if (colorMeasure) {
                        colorValues = colorMeasure.values;
                        console.log("Color Values FOund:", colorValues);

                        minColorValue = Math.min(...colorValues);
                        maxColorValue = Math.max(...colorValues);

                        // Compute class breaks using quantiles, we can also use other methods like equal interval, etc.
                        classBreaks = chroma.limits(colorValues, choroplethOptions.classificationMethod as 'q' | 'e' | 'l' | 'k', choroplethOptions.classes);

                        // Log the breaks (optional)
                        console.log('Class breaks:', classBreaks);

                        // Create a color scale based on the breaks
                        colorScale = chroma.scale([choroplethOptions.minColor, choroplethOptions.midColor, choroplethOptions.maxColor])
                            //.mode('lab') // Use the LAB color space for better color interpolation
                            .domain(classBreaks)
                            .colors(choroplethOptions.classes);

                        console.log('Color Scale:', colorScale);

                        //render choropleth
                        /* Chopleth Map */
                        this.choroplethVectorSource.clear();

                        if (pcodes && choroplethOptions.adminLevel.length > 0 && choroplethOptions.countryISO3Code.length > 0) {
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
                                this.renderChoropleth(this.geojsonDataCache, colorValues, validPCodes, choroplethOptions.adminLevel,
                                    choroplethOptions.strokeColor, choroplethOptions.strokeWidth, choroplethOptions.layerOpacity, classBreaks, colorScale);
                            } else {
                                // Show loading indicator since we're fetching data
                                //this.showLoadingIndicator();

                                // Construct the dynamic GeoJSON API URL
                                const geoJsonUrl = `https://codgis.itos.uga.edu/arcgis/rest/services/COD_External/${choroplethOptions.countryISO3Code}_pcode/FeatureServer/${choroplethOptions.adminLevel}/query?where=0%3D0&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&distance=&units=esriSRUnit_Foot&relationParam=&outFields=*&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&outSR=&gdbVersion=&historicMoment=&returnDistinctValues=false&returnIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&multipatchOption=&resultOffset=&resultRecordCount=&returnTrueCurves=false&sqlFormat=none&f=geojson`;

                                // Fetch GeoJSON data from the API
                                fetch(geoJsonUrl)
                                    .then(response => response.json())
                                    .then(geojsonData => {
                                        // Cache the GeoJSON data
                                        this.geojsonDataCache = geojsonData;

                                        // Process the fetched GeoJSON data
                                        this.renderChoropleth(geojsonData, colorValues, validPCodes, choroplethOptions.adminLevel,
                                            choroplethOptions.strokeColor, choroplethOptions.strokeWidth, choroplethOptions.layerOpacity, classBreaks, colorScale);
                                    })
                                    .catch(error => {
                                        console.error("Error fetching GeoJSON data:", error);
                                    });
                            }
                        }

                    } else {
                        // render choropleth with default color
                        console.log("Color Values not found. Rendering default choropleth.");
    
                    }
                } 

            } else {
                console.warn("PCodes not found.");
                this.clearMap(this.choroplethVectorSource);
                //return;
            }

        }

        //order layers
        this.choroplethVectorLayer.setZIndex(1); // Lower zIndex (below)
        this.circleVectorLayer.setZIndex(2); // Higher zIndex (above)

        //this.updateChoropleth(choroplethColor, choroplethStrokeColor, choroplethStrokeWidth);
        //this.updatecircles(cirleSize, cirleColor, cirleStrokeColor, cirleStrokeWidth);

        //this.fitMapToFeatures(); // Call the fit function

        this.map.updateSize();
    }



    // Function to process the GeoJSON data
    private renderChoropleth(geojsonData: any, colorValues: any, validPCodes: string[], selectedAdminLevel: string,
        selectedStrokeColor: any, selectedStrokeWidth: any, layerOpacity: any, classBreaks: any, colorScale: any): void {

        // Create a vector source from the fetched GeoJSON data
        //console.log("GeoJSON data retrieved:", geojsonData);

        let pcodeKey = `ADM${selectedAdminLevel}_PCODE`; // Use the appropriate key based on the admin level

        // Filter features based on some condition, e.g., ADM2_PCODE
        const filteredFeatures = geojsonData.features.filter(feature => {
            const featurePCode = feature.properties[pcodeKey]; // Example filter condition
            return validPCodes.includes(featurePCode); // Keep features that match valid PCodes
        });

        //console.log("GeoJSON data filtered:", filteredFeatures);

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

        // Create a vector layer using the vector source
        this.choroplethVectorLayer = new VectorLayer({

            source: this.choroplethVectorSource,

            style: (feature) => { //using arrow function to bind this

                // Check if the feature's ADMx_PCODE (or equivalent) matches any valid PCode
                const featurePCode = feature.get(pcodeKey);

                if (validPCodes.includes(featurePCode)) {

                    const value = colorValues[validPCodes.indexOf(featurePCode)];

                    let color = '#009edb'; // Default color

                    // Use class breaks to assign colors based on value
                    for (let i = 0; i < classBreaks.length; i++) {

                        if (value <= classBreaks[i]) {

                            color = colorScale[i];
                            break;
                        }
                    }

                    console.log('Assigned Color:', color);

                    return new Style({
                        fill: new Fill({
                            color: color
                        }),
                        stroke: new Stroke({
                            color: selectedStrokeColor,
                            width: selectedStrokeWidth
                        })
                    });

                    //return this.choroplethStyle;
                } else {
                    // Return null to skip rendering this feature
                    return null;
                }
            },
            opacity: layerOpacity
        });

        this.map.addLayer(this.choroplethVectorLayer);

        // Fit map view to the extent of the loaded GeoJSON data
        this.fitMapToFeatures()

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

    private clearMap(vectorSource: VectorSource): void {
        vectorSource.clear();
        this.map.updateSize();
    }

    private fitMapToFeatures() {
        if (this.circleVectorSource.getFeatures().length > 0) {
            this.map.getView().fit(this.circleVectorSource.getExtent(), { padding: [50, 50, 50, 50], duration: 1000 });
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

    // Show loading indicator
    private showLoadingIndicator() {
        document.getElementById('loadingIndicator')!.style.display = 'block'; // Show loading indicator (Assume a div with this ID exists)
    }

    // Hide loading indicator
    private hideLoadingIndicator() {
        document.getElementById('loadingIndicator')!.style.display = 'none'; // Hide loading indicator
    }

    private hexToRgb(hex) {
        // Remove the '#' if it's present
        hex = hex.replace('#', '');

        // Parse the hex color and return the RGB values
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);

        return `rgb(${r}, ${g}, ${b})`;
    }

    private hexToRgba(hex, opacity) {
        // Get the RGB representation from the hex color
        let rgbColor = this.hexToRgb(hex);

        // Convert the rgb() string to rgba() with the opacity value
        return rgbColor.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
    }

    public destroy(): void {
        this.map.setTarget(null);
    }
}
