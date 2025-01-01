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

import { HumanitarianMapVisualFormattingSettingsModel } from "./settings";

import { Basemap } from "./basemap";

import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { MapboxVectorLayer } from 'ol-mapbox-style';

import { Feature } from "ol";
import Point from "ol/geom/Point";
import { fromLonLat } from "ol/proj";

import Style from "ol/style/Style";
import Circle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";

import { easeOut } from "ol/easing";

import * as chroma from "chroma-js"; // Import chroma module
import * as ss from 'simple-statistics';
import Geostats from 'geostats';

import Overlay from "ol/Overlay"; // Import Overlay class
import GeoJSON from "ol/format/GeoJSON";
import TileLayer from "ol/layer/Tile";
import Attribution from 'ol/control/Attribution';
import { defaults as defaultControls } from 'ol/control';

import { BasemapOptions, ChoroplethOptions, CircleOptions } from "./types";
import { ColorRampGenerator } from "./colors";

export class Visual implements IVisual {

    private formattingSettingsService: FormattingSettingsService;
    private visualFormattingSettingsModel: HumanitarianMapVisualFormattingSettingsModel;

    private basemap: Basemap;
    private basemapLayer: TileLayer;
    private mapboxVectorLayer: MapboxVectorLayer;
    private map: Map;
    private fitMapOptions: any;
    private circleVectorSource: VectorSource;
    private choroplethVectorSource: VectorSource;
    private container: HTMLElement;
    private circleVectorLayer: VectorLayer;
    private choroplethVectorLayer: VectorLayer;
    private circleStyle: Style;
    private choroplethStyle: Style;
    private tooltip: Overlay;
    private colorRampGenerator: ColorRampGenerator;
    private isDataLoading: boolean = false;

    constructor(options: VisualConstructorOptions) {

        this.formattingSettingsService = new FormattingSettingsService();
        this.visualFormattingSettingsModel = new HumanitarianMapVisualFormattingSettingsModel();

        this.basemap = new Basemap();
        this.basemapLayer = this.basemap.getDefaultBasemap();

        this.container = options.element;

        // Ensure the container has proper dimensions
        this.container.style.width = "100%";
        this.container.style.height = "100%";

        // Ensure the legend container is also appended to the same parent
        const legendContainer = document.createElement("div");
        legendContainer.setAttribute("id", "legend");
        legendContainer.style.position = "absolute";
        legendContainer.style.zIndex = "1000";
        legendContainer.style.top = "5px";
        legendContainer.style.right = "5px";
        legendContainer.style.backgroundColor = "white";
        legendContainer.style.display = "none"; // Hidden by default

        const legendTitle = document.createElement("h4");
        legendTitle.textContent = "Legend";
        legendContainer.appendChild(legendTitle);

        this.container.appendChild(legendContainer);

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
                this.basemapLayer
            ],
            view: new View({
                projection: 'EPSG:3857',
                center: fromLonLat([0, 0]), // Center the map at the origin
                zoom: 2
            }),
            controls: defaultControls({
                attribution: true, // Ensure attribution control is enabled
                attributionOptions: {
                    collapsible: false, // Keep the attribution always visible
                },
            })
        });

        this.fitMapOptions = {
            padding: [50, 50, 50, 50],
            duration: 1000,
            easing: easeOut
        };

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

    update(options: VisualUpdateOptions) {

        // Retrieve the model and settings
        this.visualFormattingSettingsModel = this.getFormattingSettings(options);
        const basemapOptions = this.getBasemapOptions();
        const circleOptions = this.getCircleOptions();
        const choroplethOptions = this.getChoroplethOptions();

        this.colorRampGenerator = new ColorRampGenerator(choroplethOptions.colorRamp);

        // Check data validity
        const dataView = options.dataViews[0];

        if (!dataView || !dataView.categorical) {
            console.log("No categorical data found.");
            this.clearMap(this.circleVectorSource);
            this.clearMap(this.choroplethVectorSource);
            return;
        }

        // Update the basemap
        this.updateBasemap(basemapOptions);

        // Hide the legend by default during update
        const legend = document.getElementById("legend");

        if (!choroplethOptions.showLegend || !circleOptions.showLegend) {
            legend.style.display = "none"; // Hide the legend
        }

        // Handle tooltips
        const tooltips = this.extractTooltips(dataView.categorical);

        // Render circle layer
        this.clearMap(this.circleVectorSource);
        if (circleOptions.layerControl) {

            console.log("Rendering Circle Layer");
            this.renderCircleLayer(dataView.categorical, circleOptions, tooltips);

        } else {

            this.circleVectorSource.clear();
        }

        // Render choropleth layer
        this.clearMap(this.choroplethVectorSource);
        if (choroplethOptions.layerControl) {

            console.log("Rendering Choropleth Layer");
            this.renderChoroplethLayer(dataView.categorical, choroplethOptions);

        } else {
            this.choroplethVectorSource.clear();
        }

        //order layers
        if (circleOptions.layerControl && choroplethOptions.layerControl) {

            this.choroplethVectorLayer.setZIndex(1); // Lower zIndex (below)
            this.circleVectorLayer.setZIndex(2); // Higher zIndex (above)
        }

        this.map.updateSize();
    }

    // Helper functions
    private getFormattingSettings(options: VisualUpdateOptions) {
        return this.formattingSettingsService.populateFormattingSettingsModel(
            HumanitarianMapVisualFormattingSettingsModel,
            options.dataViews[0]
        );
    }

    private getBasemapOptions(): BasemapOptions {
        const basemapSettings = this.visualFormattingSettingsModel.BasemapVisualCardSettings;
        return {
            selectedBasemap: basemapSettings.basemapSelectSettingsGroup.selectedBasemap.value.value.toString(),
            mapboxCustomStyleUrl: basemapSettings.mapBoxSettingsGroup.mapboxCustomStyleUrl.value.toString(),
            mapboxStye: basemapSettings.mapBoxSettingsGroup.mapboxStyle.value.value.toString(),
            mapboxAccessToken: basemapSettings.mapBoxSettingsGroup.mapboxAccessToken.value.toString(),
            mapboxBaseUrl: basemapSettings.mapBoxSettingsGroup.mapboxBaseUrl.value.toString(),
            declutterLabels: basemapSettings.mapBoxSettingsGroup.declutterLabels.value,
            mapboxCustomMapAttribution: basemapSettings.mapBoxSettingsGroup.mapboxCustomMapAttribution.value.toString()
        };
    }

    private getCircleOptions(): CircleOptions {
        const circleSettings = this.visualFormattingSettingsModel.ProportionalCirclesVisualCardSettings;
        return {
            layerControl: circleSettings.topLevelSlice.value,
            color: circleSettings.proportionalCirclesColor.value.value,
            minRadius: circleSettings.proportionalCirclesMinimumRadius.value,
            maxRadius: circleSettings.proportionalCirclesMaximumRadius.value,
            strokeColor: circleSettings.proportionalCirclesStrokeColor.value.value,
            strokeWidth: circleSettings.proportionalCirclesStrokeWidth.value,
            layerOpacity: circleSettings.proportionalCirclesLayerOpacity.value / 100,
            showLegend: circleSettings.showLegend.value
        };
    }

    private getChoroplethOptions(): ChoroplethOptions {

        const choroplethSettings = this.visualFormattingSettingsModel.ChoroplethVisualCardSettings;
        const choroplethDisplaySettings = choroplethSettings.choroplethDisplaySettingsGroup;
        const choroplethLocationSettings = choroplethSettings.pcodesAdminLocationSettingsGroup;
        const choroplethClassificationSettings = choroplethSettings.choroplethClassificationSettingsGroup;
        const choroplethLegendSettings = choroplethSettings.choroplethLegendSettingsGroup;

        return {
            layerControl: choroplethSettings.topLevelSlice.value,
            countryISO3Code: choroplethLocationSettings.selectedISO3Code.value,
            adminLevel: choroplethLocationSettings.selectedAdminLevel.value.value.toString(),
            classifyData: choroplethClassificationSettings.classifyData.value,
            usePredefinedColorRamp: choroplethDisplaySettings.usePredefinedColorRamp.value,
            invertColorRamp: choroplethDisplaySettings.invertColorRamp.value,
            colorRamp: choroplethDisplaySettings.colorRamp.value.value.toString(),
            midColor: choroplethDisplaySettings.midColor.value.value,
            classes: choroplethClassificationSettings.numClasses.value,
            classificationMethod: choroplethClassificationSettings.classificationMethod.value.value.toString(),
            minColor: choroplethDisplaySettings.minColor.value.value,
            maxColor: choroplethDisplaySettings.maxColor.value.value,
            strokeColor: choroplethDisplaySettings.strokeColor.value.value,
            strokeWidth: choroplethDisplaySettings.strokeWidth.value,
            layerOpacity: choroplethDisplaySettings.layerOpacity.value / 100,
            showLegend: choroplethLegendSettings.showLegend.value,
            legendTitle: choroplethLegendSettings.legendTitle.value
        };
    }

    private extractTooltips(categorical: any) {
        if (categorical.values && categorical.values.length > 0) {
            const tooltipMeasure = categorical?.values?.find(c => c.source?.roles && c.source.roles['Tooltips']);
            if (tooltipMeasure) {
                //console.log("Tooltips Found:", tooltipMeasure.values);
                return tooltipMeasure.values;
            } else {
                //console.log("Tooltips not found.");
            }
        } else {
            //console.log("No values found.");
        }
        return undefined;
    }

    private updateBasemap(basemapOptions: BasemapOptions) {
        if (basemapOptions.selectedBasemap === "mapbox") {
            this.mapboxVectorLayer = this.basemap.getMapboxBasemap(basemapOptions);
            let attribution = '© Mapbox © OpenStreetMap';
            if (basemapOptions.mapboxCustomMapAttribution) {
                attribution += " " + basemapOptions.mapboxCustomMapAttribution;
            }
            this.mapboxVectorLayer.getSource()?.setAttributions(attribution);
            this.map.getLayers().setAt(0, this.mapboxVectorLayer);
        } else {
            this.basemapLayer = this.basemap.getBasemap(basemapOptions);
            this.map.getLayers().setAt(0, this.basemapLayer);
        }
    }

    private renderCircleLayer(categorical: any, circleOptions: CircleOptions, tooltips: any[]) {
        let longitudes: number[] | undefined;
        let latitudes: number[] | undefined;
        let circleSizeValues: number[] | undefined;
        let minCircleSizeValue: number | undefined;
        let maxCircleSizeValue: number | undefined;
        let circleScale: number | undefined;

        const lonCategory = categorical?.categories?.find(c => c.source?.roles && c.source.roles['Longitude']);
        const latCategory = categorical?.categories?.find(c => c.source?.roles && c.source.roles['Latitude']);
        if (lonCategory && latCategory) {
            longitudes = lonCategory.values as number[];
            latitudes = latCategory.values as number[];

            if (longitudes.length !== latitudes.length) {
                console.warn("Longitude and Latitude have different lengths.");
                this.clearMap(this.circleVectorSource);
            } else {
                // Handle Circle Size Measure or default size
                const CircleSizeMeasure = categorical?.values?.find(c => c.source?.roles && c.source.roles['Size']);
                if (CircleSizeMeasure) {

                    circleSizeValues = CircleSizeMeasure.values as number[];
                    minCircleSizeValue = Math.min(...circleSizeValues);
                    maxCircleSizeValue = Math.max(...circleSizeValues);
                    circleScale = (circleOptions.maxRadius - circleOptions.minRadius) / (maxCircleSizeValue - minCircleSizeValue);

                    this.renderProportionalCircles(longitudes, latitudes, circleSizeValues, circleOptions, tooltips, minCircleSizeValue, circleScale);


                } else {

                    this.renderDefaultCircles(longitudes, latitudes, circleOptions, tooltips);

                }
            }
        } else {
            console.warn("Both Longitude and Latitude roles must be assigned.");
            this.clearMap(this.circleVectorSource);
        }
    }

    private renderProportionalCircles(longitudes: number[], latitudes: number[], circleSizeValues: number[], circleOptions: CircleOptions, tooltips: any[], minCircleSizeValue: number, circleScale: number) {
        this.circleVectorSource.clear();

        longitudes.forEach((lon, i) => {
            const lat = latitudes[i];
            const size = circleSizeValues[i];
            const radius = circleOptions.minRadius + (size - minCircleSizeValue) * circleScale;

            if (isNaN(lon) || isNaN(lat)) {
                console.warn(`Skipping invalid point: lon = ${lon}, lat = ${lat}`);
                return;
            }

            const point = new Feature({
                geometry: new Point(fromLonLat([lon, lat])),
                size: size,
                tooltip: tooltips ? tooltips[i] : undefined
            });

            point.setStyle(new Style({
                image: new Circle({
                    radius: radius,
                    fill: new Fill({ color: circleOptions.color }),
                    stroke: new Stroke({ color: circleOptions.strokeColor, width: circleOptions.strokeWidth })
                })
            }));

            this.circleVectorSource.addFeature(point);
        });

        this.circleVectorLayer.setOpacity(circleOptions.layerOpacity);

        this.fitMapToFeatures();
        this.map.addLayer(this.circleVectorLayer);
    }

    private renderDefaultCircles(longitudes: number[], latitudes: number[], circleOptions: CircleOptions, tooltips: any[]) {
        this.circleVectorSource.clear();

        longitudes.forEach((lon, i) => {
            const lat = latitudes[i];
            if (isNaN(lon) || isNaN(lat)) {
                console.warn(`Skipping invalid point: lon = ${lon}, lat = ${lat}`);
                return;
            }

            const point = new Feature({
                geometry: new Point(fromLonLat([lon, lat])),
                tooltip: tooltips ? tooltips[i] : undefined
            });

            point.setStyle(new Style({
                image: new Circle({
                    radius: circleOptions.minRadius, // Default size
                    fill: new Fill({ color: circleOptions.color }),
                    stroke: new Stroke({ color: circleOptions.strokeColor, width: circleOptions.strokeWidth })
                })
            }));

            this.circleVectorSource.addFeature(point);
        });
        this.circleStyle = new Style({
            image: new Circle({
                radius: circleOptions.minRadius, // Default size
                fill: new Fill({ color: circleOptions.color }),
                stroke: new Stroke({ color: circleOptions.strokeColor, width: circleOptions.strokeWidth })
            })
        });
        this.circleVectorLayer = new VectorLayer({
            source: this.circleVectorSource,
            style: this.circleStyle,
            opacity: circleOptions.layerOpacity
        });

        this.fitMapToFeatures();

        this.map.addLayer(this.circleVectorLayer);

    }

    private renderChoroplethLayer(categorical: any, choroplethOptions: ChoroplethOptions) {

        const adminPCodeCategory = categorical.categories.find(c => c.source?.roles && c.source.roles['AdminPCode']);
        if (!adminPCodeCategory) {
            console.warn("PCodes not found.");
            this.choroplethVectorSource.clear();
            return;
        }

        const pcodes = adminPCodeCategory.values as string[];
        if (!categorical.values || categorical.values.length === 0) {
            console.warn("Measures not found.");
            this.choroplethVectorSource.clear();
            return;
        }

        const colorMeasure = categorical.values.find(c => c.source?.roles && c.source.roles['Color']);
        if (!colorMeasure) {
            console.warn("Color Measure not found.");
            this.choroplethVectorSource.clear();
            return;
        }

        const colorValues = colorMeasure.values;

        const classBreaks = this.getClassBreaks(colorValues, choroplethOptions);

        const colorScale = this.getColorScale(classBreaks, choroplethOptions);

        if (!pcodes || choroplethOptions.adminLevel.length === 0 || choroplethOptions.countryISO3Code.length === 0) {
            console.warn("No PCodes or Admin level or Country iso3 code found. Exiting...");
            return;
        }

        const validPCodes = pcodes.filter(pcode => {
            if (!pcode) {
                console.warn(`Skipping invalid PCode: ${pcode}`);
                return false;
            }
            return true;
        });

        if (validPCodes.length === 0) {
            console.warn("No valid PCodes found. Exiting...");
            return;
        }

        const cacheKey = `${choroplethOptions.countryISO3Code}_${choroplethOptions.adminLevel}`;
        const serviceUrl = `https://codgis.itos.uga.edu/arcgis/rest/services/COD_External/${choroplethOptions.countryISO3Code}_pcode/FeatureServer/${choroplethOptions.adminLevel}/query?where=0%3D0&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&distance=&units=esriSRUnit_Foot&relationParam=&outFields=*&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&outSR=&gdbVersion=&historicMoment=&returnDistinctValues=false&returnIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&multipatchOption=&resultOffset=&resultRecordCount=&returnTrueCurves=false&sqlFormat=none&f=geojson`;
        const maxAge = 3600000; // Cache expiry time (1 hour)

        fetchGeoJsonWithCaching(serviceUrl, cacheKey, maxAge)
            .then(geojsonData => {
                this.createChoroplethLayer(geojsonData, colorValues, validPCodes, choroplethOptions.adminLevel,
                    choroplethOptions.strokeColor, choroplethOptions.strokeWidth, choroplethOptions.layerOpacity,
                    classBreaks, colorScale);
                this.fitMapToFeatures();
            })
            .catch(error => {
                console.error("Error fetching GeoJSON data:", error);
            });

        if (choroplethOptions.showLegend) {

            this.createChoroplethLegend(classBreaks, colorScale, "inside", choroplethOptions.legendTitle);

        } else {
            const legend = document.getElementById("legend");
            if (legend) {
                legend.style.display = "none"; // Hide the legend
            }
        }
    }

    // Function to process the GeoJSON data
    private createChoroplethLayer(geojsonData: any, colorValues: any, validPCodes: string[], selectedAdminLevel: string,
        selectedStrokeColor: any, selectedStrokeWidth: any, layerOpacity: any, classBreaks: any, colorScale: any): void {

        this.choroplethVectorSource.clear(); // Clear existing features

        let pcodeKey = `ADM${selectedAdminLevel}_PCODE`; // Use the appropriate key based on the admin level

        // Filter features based on some condition, e.g., ADM2_PCODE
        const filteredFeatures = geojsonData.features.filter(feature => {
            const featurePCode = feature.properties[pcodeKey]; // Example filter condition
            return validPCodes.includes(featurePCode); // Keep features that match valid PCodes
        });

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
                        // Check if value falls within the range [classBreaks[i], classBreaks[i+1])
                        if (value >= classBreaks[i] && value < classBreaks[i + 1]) {
                            color = colorScale[i];
                            break;
                        }
                    }
                    // Handle edge case: value equals the maximum class break
                    if (value >= classBreaks[classBreaks.length - 1]) {
                        color = colorScale[colorScale.length - 1];
                    }

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

        this.fitMapToFeatures();

        this.map.addLayer(this.choroplethVectorLayer);
    }

    private createChoroplethLegend(
        classBreaks: number[],
        colorScale: string[],
        labelPosition: "top" | "inside" | "bottom" = "inside",
        legendTitle: string = "Legend",
        formatTemplate: string = "{:.1f}", // Custom formatting template
        titleAlignment: "left" | "center" | "right" = "left", // Title alignment option
        gapSize: number = 2.5 // Custom gap size between color boxes (default 2.5px)
    ): void {
        const legend = document.getElementById("legend");
        if (!legend) return;

        // Clear existing legend
        while (legend.firstChild) {
            legend.removeChild(legend.firstChild);
        }

        // Style the legend container
        legend.style.display = "flex";
        legend.style.flexDirection = "column"; // Stack the title and legend items vertically
        legend.style.alignItems = "flex-start"; // Align the items to the left by default
        legend.style.gap = "5px"; // Add spacing between title and items
        legend.style.background = "none"; // Remove white background
        legend.style.border = "none"; // Remove black outline

        // Add title to the legend with customizable alignment
        const title = document.createElement("div");
        title.textContent = legendTitle;
        title.style.fontSize = "12px";
        title.style.fontWeight = "bold";
        title.style.marginBottom = "5px";

        // Align the title based on user selection
        title.style.textAlign = titleAlignment; // Apply the specified alignment

        // Align the title itself depending on the alignment choice
        if (titleAlignment === "left") {
            title.style.marginLeft = "0"; // Ensure it's at the left edge of the legend
        } else if (titleAlignment === "center") {
            title.style.marginLeft = "auto";
            title.style.marginRight = "auto"; // Center the title
        } else if (titleAlignment === "right") {
            title.style.marginLeft = "auto"; // Align to the right side
        }

        // Append the title to the legend
        legend.appendChild(title);

        // Create horizontal layout for legend items
        const itemsContainer = document.createElement("div");
        itemsContainer.style.display = "flex";
        itemsContainer.style.flexDirection = "row";
        itemsContainer.style.alignItems = "flex-start";
        itemsContainer.style.gap = `${gapSize}px`; // Set the gap size between color boxes

        for (let i = 0; i < classBreaks.length - 1; i++) {
            const upperValue = classBreaks[i + 1];
            const formattedLabel = formatValue(upperValue, formatTemplate); // Format the value dynamically
            const color = colorScale[i];

            // Create legend item container
            const legendItem = document.createElement("div");
            legendItem.style.display = "flex";
            legendItem.style.flexDirection = "column";
            legendItem.style.alignItems = "center";

            // Calculate the dynamic width of the color box
            const boxWidth = `${formattedLabel.length * 5 + 10}px`; // Label length * 10px + 20px padding

            // Create color box with reduced size (half the original height)
            const colorBox = document.createElement("div");
            colorBox.style.position = "relative"; // For positioning the label inside if needed
            colorBox.style.width = boxWidth; // Dynamic width
            colorBox.style.height = "20px"; // Reduced height (half of the original)
            colorBox.style.backgroundColor = color;
            colorBox.style.textAlign = "center";
            colorBox.style.display = "flex"; // Flexbox for centering content
            colorBox.style.justifyContent = "center";
            colorBox.style.alignItems = labelPosition === "inside" ? "center" : "flex-start";

            // Add label
            const label = document.createElement("span");
            label.textContent = formattedLabel;
            label.style.color = labelPosition === "inside" ? "#fff" : "#000"; // Contrast label color for inside
            label.style.fontSize = "10px";

            // Append label based on position
            if (labelPosition === "top") {
                // Add label on top
                label.style.marginBottom = "5px";
                legendItem.appendChild(label);
                legendItem.appendChild(colorBox);
            } else if (labelPosition === "bottom") {
                // Add label below
                label.style.marginTop = "5px";
                legendItem.appendChild(colorBox);
                legendItem.appendChild(label);
            } else {
                // Add label inside the box
                colorBox.appendChild(label);
                legendItem.appendChild(colorBox);
            }

            // Append each legend item to the items container
            itemsContainer.appendChild(legendItem);
        }

        // Append the items container to the legend
        legend.appendChild(itemsContainer);

        // Ensure the legend is visible
        legend.style.display = "flex";
    }

    private getClassBreaks(colorValues: any[], choroplethOptions: ChoroplethOptions): any[] {
        if (choroplethOptions.classifyData) {
            if (choroplethOptions.classificationMethod === 'j') {
                return ss.jenks(colorValues, choroplethOptions.classes);
            } else {
                return chroma.limits(colorValues, choroplethOptions.classificationMethod as 'q' | 'e' | 'l' | 'k', choroplethOptions.classes);
            }
        } else {
            return Array.from(new Set(colorValues)).sort((a, b) => a - b);
        }
    }

    private getColorScale(classBreaks: any[], choroplethOptions: ChoroplethOptions): any {
        if (choroplethOptions.usePredefinedColorRamp) {
            if (choroplethOptions.invertColorRamp) {
                this.colorRampGenerator.invertRamp();
            } else {
                this.colorRampGenerator = new ColorRampGenerator(choroplethOptions.colorRamp);
            }

            return choroplethOptions.classifyData
                ? this.colorRampGenerator.generateColorRamp(choroplethOptions.classes, classBreaks)
                : this.colorRampGenerator.generateColorRamp(classBreaks.length, classBreaks);
        } else {
            return chroma.scale([choroplethOptions.minColor, choroplethOptions.midColor, choroplethOptions.maxColor])
                .mode('lab')
                .domain(classBreaks)
                .colors(choroplethOptions.classes);
        }
    }

    private createProportionalCircleLegend(
        minValue: number,
        maxValue: number,
        circleOptions: { minRadius: number, maxRadius: number }
    ): void {
        const legend = document.getElementById("legend");
        if (!legend) return;

        // Clear any existing legend content
        // Clear any existing legend content
        while (legend.firstChild) {
            legend.removeChild(legend.firstChild);
        }

        // We will only display the min and max values
        const representativeValues = [minValue, maxValue];

        // Create the legend items
        representativeValues.forEach(value => {
            // Calculate the radius for the current value
            const circleScale = (circleOptions.maxRadius - circleOptions.minRadius) / (maxValue - minValue);
            const radius = circleOptions.minRadius + (value - minValue) * circleScale;

            // Create the circle using a div with a dynamic size
            const circle = document.createElement("div");
            circle.style.width = `${radius * 2}px`;  // 2 * radius to get diameter
            circle.style.height = `${radius * 2}px`; // 2 * radius to get diameter
            circle.style.borderRadius = "50%";  // Makes it circular
            circle.style.backgroundColor = "rgba(0, 0, 255, 0.6)"; // Adjust color as needed
            circle.style.marginRight = "10px"; // Space between circle and label
            circle.style.display = "inline-block"; // Ensure it displays inline with the text

            // Create the legend item container
            const legendItem = document.createElement("div");
            legendItem.style.display = "flex";
            legendItem.style.alignItems = "center";
            legendItem.style.marginBottom = "10px";

            // Create the label for the value
            const label = document.createElement("span");
            label.textContent = `${value}`;

            // Append the circle and label to the legend item
            legendItem.appendChild(circle);
            legendItem.appendChild(label);

            // Append the legend item to the legend container
            legend.appendChild(legendItem);

            legend.style.display = "block"; // Show the legend
        });
    }

    private fitMapToFeatures() {        
        
        if (this.circleVectorSource.getFeatures().length > 0) {

            // Fit to circleVectorSource if choroplethVectorSource has no features
            this.map.getView().fit(this.circleVectorSource.getExtent(), this.fitMapOptions);
        }

        if (this.choroplethVectorSource.getFeatures().length > 0) {

            // Prioritize fitting to choroplethVectorSource if it has features
            this.map.getView().fit(this.choroplethVectorSource.getExtent(), this.fitMapOptions);

        } 

        this.map.updateSize();
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.visualFormattingSettingsModel);
    }

    private clearMap(vectorSource: VectorSource): void {
        vectorSource.clear();
        this.map.updateSize();
    }

    public destroy(): void {
        //this.basemap.destroy();
        this.map.setTarget(null);
    }

}

function formatValue(value: number, formatTemplate: string): string {
    let formattedValue: number;
    let suffix: string = "";

    if (value >= 1_000_000) {  // Millions
        formattedValue = value / 1_000_000;
        suffix = "M";
    } else if (value >= 1_000) {  // Thousands
        formattedValue = value / 1_000;
        suffix = "k";
    } else {
        formattedValue = value;
    }

    // Use custom format template to format the number
    return `${formatTemplate.replace("{:.1f}", formattedValue.toFixed(1))}${suffix}`;
}

const memoryCache: Record<string, { data: any; timestamp: number }> = {};

// Cache GeoJSON data, avoiding overwriting if it's a duplicate
async function cacheGeoJsonData(key: string, data: any): Promise<void> {
    const existingCache = memoryCache[key];

    // Check if the data is identical to the current cached data
    if (existingCache && existingCache.data === data) {
        console.log("Duplicate cache entry. Skipping cache update.");
        return;
    }

    // Cache the new data and update timestamp
    memoryCache[key] = { data, timestamp: Date.now() };
    console.log("GeoJSON data cached in memory.");
}

// Retrieve GeoJSON data from cache
async function getCachedGeoJsonData(key: string): Promise<any | null> {
    return memoryCache[key]?.data || null;
}

// Check if cached data is expired
async function isCacheExpired(key: string, maxAge: number): Promise<boolean> {
    const cacheEntry = memoryCache[key];
    if (!cacheEntry) return true;
    return (Date.now() - cacheEntry.timestamp) > maxAge;
}

// Fetch GeoJSON data with caching
async function fetchGeoJsonWithCaching(serviceUrl: string, cacheKey: string, maxAge: number = 3600000): Promise<any> {
    if (await isCacheExpired(cacheKey, maxAge)) {
        console.log("Fetching data from service...");
        const response = await fetch(serviceUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch GeoJSON data: ${response.statusText}`);
        }
        const geojsonData = await response.json();
        await cacheGeoJsonData(cacheKey, geojsonData);
        return geojsonData;
    }

    console.log("Using cached data.");
    return getCachedGeoJsonData(cacheKey);
}

