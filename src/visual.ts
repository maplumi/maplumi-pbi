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
import { constants } from "./constants";

import { createTooltipServiceWrapper, ITooltipServiceWrapper, TooltipEventArgs } from "powerbi-visuals-utils-tooltiputils";
import ISelectionIdBuilder = powerbi.visuals.ISelectionIdBuilder;

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionId = powerbi.visuals.ISelectionId;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import PrimitiveValue = powerbi.PrimitiveValue;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;


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

import Overlay from "ol/Overlay"; // Import Overlay class
import GeoJSON from "ol/format/GeoJSON";

import TileLayer from "ol/layer/Tile";
import Attribution from 'ol/control/Attribution';
import { defaults as defaultControls } from 'ol/control';

import { BasemapOptions, ChoroplethOptions, CircleOptions } from "./types";
import { ColorRampGenerator } from "./colors";
import * as d3 from "d3";
import { Pixel } from "ol/pixel";
import { FeatureLike } from "ol/Feature";

interface TooltipDataItem {
    displayName: string;
    value: string;
    data: { displayName: string; value: string; }[];
    // ... other properties you might need (header, color, etc.)
}

export class Visual implements IVisual {

    private formattingSettingsService: FormattingSettingsService;
    private visualFormattingSettingsModel: HumanitarianMapVisualFormattingSettingsModel;

    private selectionManager: ISelectionManager;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private tooltipService: powerbi.extensibility.ITooltipService;
    private selectionIdBuilder: ISelectionIdBuilder;

    private host: IVisualHost;
    private container: HTMLElement;

    private svg: d3.Selection<SVGElement, unknown, HTMLElement, any>;
    private d3Container: any;
    private map: Map;
    private features: Feature[] = [];

    private basemap: Basemap;
    private basemapLayer: TileLayer;
    private mapboxVectorLayer: MapboxVectorLayer;

    private fitMapOptions: any;
    private circleVectorSource: VectorSource;
    private choroplethVectorSource: VectorSource;

    private circleVectorLayer: VectorLayer;
    private choroplethVectorLayer: VectorLayer;
    private circleStyle: Style;
    private circleHighlightStyle: Style;
    private choroplethStyle: Style;
    private choroplethHighlightStyle: Style;
    private tooltip: Overlay;
    private colorRampGenerator: ColorRampGenerator;
    private isDataLoading: boolean = false;

    constructor(options: VisualConstructorOptions) {

        this.host = options.host;
        this.selectionManager = options.host.createSelectionManager();

        this.formattingSettingsService = new FormattingSettingsService();
        this.visualFormattingSettingsModel = new HumanitarianMapVisualFormattingSettingsModel();

        this.basemap = new Basemap();
        this.basemapLayer = this.basemap.getDefaultBasemap();

        this.container = options.element;

        const handleTouchDelay = 1000; //default touch delay

        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, this.container, handleTouchDelay);

        this.tooltipService = options.host.tooltipService;

        this.selectionIdBuilder = options.host.createSelectionIdBuilder();

        // Ensure the container has proper dimensions
        this.container.style.width = "100%";
        this.container.style.height = "100%";

        // Ensure the choropleth legend container is also appended to the same parent
        const choroplethLegendContainer = document.createElement("div");
        choroplethLegendContainer.setAttribute("id", "legend");
        choroplethLegendContainer.style.position = "absolute";
        choroplethLegendContainer.style.zIndex = "1000";
        choroplethLegendContainer.style.top = "10px";
        choroplethLegendContainer.style.right = "10px";
        choroplethLegendContainer.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
        choroplethLegendContainer.style.display = "none"; // Hidden by default

        const legendTitle = document.createElement("h4");
        legendTitle.textContent = "Legend";
        choroplethLegendContainer.appendChild(legendTitle);

        this.container.appendChild(choroplethLegendContainer);

        // Ensure the circle legend container is also appended to the same parent
        const circleLegendContainer = document.createElement("div");
        circleLegendContainer.setAttribute("id", "legend2");
        circleLegendContainer.style.position = "absolute";
        circleLegendContainer.style.zIndex = "1000";
        circleLegendContainer.style.bottom = "40px";
        circleLegendContainer.style.left = "10px";
        circleLegendContainer.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
        circleLegendContainer.style.borderRadius = "4px";
        circleLegendContainer.style.display = "none"; // Hidden by default

        const circleLegendTitle = document.createElement("h4");
        circleLegendTitle.textContent = "Legend";
        circleLegendContainer.appendChild(circleLegendTitle);

        this.container.appendChild(circleLegendContainer);

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

        // D3 for map interaction
        this.svg = d3.select(this.map.getViewport()).append("svg");
        this.d3Container = this.svg.append("g"); // Container for features


        // Fit map options
        this.fitMapOptions = {
            padding: [50, 50, 50, 50],
            duration: 1000,
            easing: easeOut
        };

        console.log("Visual initialized.");

    }

    update(options: VisualUpdateOptions) {

        // Clear existing svg elements
        this.svg.selectAll('*').remove();

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


        let allowInteractions = this.host.hostCapabilities.allowInteractions;
        // this.map.on('click', function (d) {
        //     if (allowInteractions) {
        //         this.selectionManager.select(d.selectionId);

        //     }
        // });

        // Update the basemap
        this.updateBasemap(basemapOptions);

        // Order layers if both circle and choropleth layers are enabled
        if (circleOptions.layerControl && choroplethOptions.layerControl) {

            this.choroplethVectorLayer.setZIndex(1); // Lower zIndex (below)
            this.circleVectorLayer.setZIndex(2); // Higher zIndex (above)
        }

        // Clear vector sources before rendering
        this.circleVectorSource.clear();
        this.choroplethVectorSource.clear();

        // Get legend containers by Id
        const choroplethlegend = document.getElementById("legend");
        const circlelegend = document.getElementById("legend2");

        // Ensure legends are hidden when updating
        choroplethlegend.style.display = "none";
        circlelegend.style.display = "none";

        // Ensure legends are hidden when show legend toggle is off
        if (!choroplethOptions.showLegend || !circleOptions.showLegend) {
            choroplethlegend.style.display = "none"; // Hide choropleth legend
            circlelegend.style.display = "none"; // Hide circle legend
        }

        // Extract tooltips
        const tooltips = this.extractTooltips(dataView.categorical);

        // Map each layer control to its respective rendering function
        const layersToRender = [
            { condition: choroplethOptions.layerControl, render: () => this.renderChoroplethLayer(dataView.categorical, choroplethOptions) },
            { condition: circleOptions.layerControl, render: () => this.renderCircleLayer(dataView.categorical, circleOptions, tooltips) }

        ];

        // Filter and execute rendering for active layers
        const activeLayers = layersToRender.filter(layer => layer.condition);

        if (activeLayers.length > 0) {
            console.log(`Rendering ${activeLayers.length > 1 ? "both Circle & Choropleth" : activeLayers[0].condition ? "Circle" : "Choropleth"} Layers`);
            activeLayers.forEach(layer => layer.render());
        } else {
            console.log("No layers to render");
        }


        // Force the map to update its size
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
            customMapAttribution: basemapSettings.basemapSelectSettingsGroup.customMapAttribution.value.toString(),
            mapboxCustomStyleUrl: basemapSettings.mapBoxSettingsGroup.mapboxCustomStyleUrl.value.toString(),
            mapboxStye: basemapSettings.mapBoxSettingsGroup.mapboxStyle.value.value.toString(),
            mapboxAccessToken: basemapSettings.mapBoxSettingsGroup.mapboxAccessToken.value.toString(),
            mapboxBaseUrl: basemapSettings.mapBoxSettingsGroup.mapboxBaseUrl.value.toString(),
            declutterLabels: basemapSettings.mapBoxSettingsGroup.declutterLabels.value,

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
            showLegend: circleSettings.showLegend.value,
            legendTitle: circleSettings.legendTitle.value,
            legendTitleColor:circleSettings.legendTitleColor.value.value,
            legendItemsColor: circleSettings.legendItemsColor.value.value,
            legendBackgroundColor: circleSettings.legendBackgroundColor.value.value,
            legendBackgroundOpacity: circleSettings.legendBackgroundOpacity.value,
            legendBottomMargin: circleSettings.legendBottomMargin.value
        };
    }

    private getChoroplethOptions(): ChoroplethOptions {

        const choroplethSettings = this.visualFormattingSettingsModel.ChoroplethVisualCardSettings;
        const choroplethDisplaySettings = choroplethSettings.choroplethDisplaySettingsGroup;
        const choroplethLocationSettings = choroplethSettings.choroplethLocationBoundarySettingsGroup;
        const choroplethClassificationSettings = choroplethSettings.choroplethClassificationSettingsGroup;
        const choroplethLegendSettings = choroplethSettings.choroplethLegendSettingsGroup;

        return {
            layerControl: choroplethSettings.topLevelSlice.value,
            selectedLocationFileSource: choroplethLocationSettings.selectedLocationFileSource.value.value.toString(),
            boundaryPcodeNameId: choroplethLocationSettings.boundaryPcodeNameId.value.toString(),
            countryISO3Code: choroplethLocationSettings.selectedISO3Code.value,
            adminLevel: choroplethLocationSettings.selectedAdminLevel.value.value.toString(),
            githubRawFilePath: choroplethLocationSettings.githubRawFilePath.value,

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
            legendTitle: choroplethLegendSettings.legendTitle.value,
            legendTitleColor: choroplethLegendSettings.legendTitleColor.value.value,
            legendLabelsColor: choroplethLegendSettings.legendLabelsColor.value.value,
            legendBackgroundColor: choroplethLegendSettings.legendBackgroundColor.value.value,
            legendBackgroundOpacity: choroplethLegendSettings.legendBackgroundOpacity.value
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

        let attribution = '';
        if (basemapOptions.selectedBasemap === "mapbox") {
            this.mapboxVectorLayer = this.basemap.getMapboxBasemap(basemapOptions);
            const mapboxAttribution = '© Mapbox © OpenStreetMap';

            if (basemapOptions.customMapAttribution) {
                attribution = basemapOptions.customMapAttribution +" "+ mapboxAttribution ;
            }
            this.mapboxVectorLayer.getSource()?.setAttributions(attribution);
            this.map.getLayers().setAt(0, this.mapboxVectorLayer);
        }
        
        if(basemapOptions.selectedBasemap === "openstreetmap") {
            this.basemapLayer = this.basemap.getBasemap(basemapOptions);
            const osmAttribution = '© OpenStreetMap';
            if (basemapOptions.customMapAttribution) {
                attribution = basemapOptions.customMapAttribution +" "+ osmAttribution ;
            }
            this.basemapLayer.getSource().setAttributions(attribution);
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

            } else {
                // Handle Circle Size Measure or default size
                const CircleSizeMeasure = categorical?.values?.find(c => c.source?.roles && c.source.roles['Size']);

                if (CircleSizeMeasure) {

                    circleSizeValues = CircleSizeMeasure.values as number[];
                    minCircleSizeValue = Math.min(...circleSizeValues);
                    maxCircleSizeValue = Math.max(...circleSizeValues);
                    circleScale = (circleOptions.maxRadius - circleOptions.minRadius) / (maxCircleSizeValue - minCircleSizeValue);

                    this.renderProportionalCircles(lonCategory, longitudes, latitudes, circleSizeValues, circleOptions, tooltips, minCircleSizeValue, circleScale);

                } else {

                    this.renderDefaultCircles(longitudes, latitudes, circleOptions, tooltips);

                }
            }
        } else {
            console.warn("Both Longitude and Latitude roles must be assigned.");
            this.clearMap(this.circleVectorSource);
        }
    }

    private renderProportionalCircles(category: any, longitudes: number[], latitudes: number[], circleSizeValues: number[], circleOptions: CircleOptions, tooltips: any[], minCircleSizeValue: number, circleScale: number) {

        const radii = [];

        longitudes.forEach((lon, i) => {
            const lat = latitudes[i];
            const size = circleSizeValues[i];
            const radius = circleOptions.minRadius + (size - minCircleSizeValue) * circleScale;

            if (isNaN(lon) || isNaN(lat)) {
                console.warn(`Skipping invalid point: lon = ${lon}, lat = ${lat}`);
                return;
            }

            radii.push(radius); //store radius values for legend computation

            const point = new Feature({
                geometry: new Point(fromLonLat([lon, lat])),
                radius: radius,
                tooltip: tooltips ? tooltips[i] : undefined
            });

            point.setStyle(new Style({
                image: new Circle({
                    radius: radius,
                    fill: new Fill({ color: circleOptions.color }),
                    stroke: new Stroke({ color: circleOptions.strokeColor, width: circleOptions.strokeWidth })
                })
            }));

            this.features.push(point);

            // Update the SVG elements based on the new data
            // this.d3Container.selectAll(".feature").remove(); // Clear existing features

            // this.tooltipServiceWrapper.addTooltip(
            //     this.d3Container.selectAll('.feature'),
            //     (tooltipEvent: TooltipEventArgs<number>) => Visual.getTooltipData(tooltipEvent.data),
            //     (tooltipEvent: TooltipEventArgs<number>) => null);

            // this.d3Container.selectAll(".feature")
            // .on("mouseover", (event: MouseEvent, d: Feature, i: number) => { // Include index (i)
            //     const geometry = d.getGeometry();
            //     if (geometry instanceof Point) {
            //         const pixel: Pixel = this.map.getPixelFromCoordinate(geometry.getCoordinates());

            //         const tooltipInfo: TooltipDataItem[] = [{
            //             displayName: "Location Data", // Example header
            //             value: "", // No value needed for the header
            //             data: [{
            //                 displayName: "Longitude",
            //                 value: geometry.getCoordinates()[0].toString()
            //                 // ... add other data points here
            //             }]
            //         }];

            //         // Assuming you have a category and can get the rowIndex                    
            //         const rowIndex = i; // Use the index (i) from the mouseover event
            //         const selectionId = this.selectionIdBuilder.withCategory(category, rowIndex).createSelectionId();

            //         this.tooltipServiceWrapper.show({
            //             coordinates: [pixel[0], pixel[1]],
            //             dataItems: tooltipInfo,
            //             identities: [selectionId],
            //             isTouchEvent: false
            //         });
            //     }
            // })
            // .on("mouseout", () => {
            //     this.tooltipServiceWrapper.hide({
            //         isTouchEvent: false,
            //         immediately: true
            //     });
            // });

            this.circleVectorSource.addFeature(point);
        });

        // Create proportional circle legend
        if (circleOptions.showLegend) {

            const opacity = circleOptions.legendBackgroundOpacity / 100;
            const bgColor = circleOptions.legendBackgroundColor
            const bottomMargin = circleOptions.legendBottomMargin.toString()+'px';

            this.createProportionalCircleLegend("legend2", circleSizeValues, radii, opacity, bgColor,bottomMargin, circleOptions.legendTitle, circleOptions);
        }

        this.circleVectorLayer.setOpacity(circleOptions.layerOpacity);

        this.fitMapToFeatures();

        this.map.addLayer(this.circleVectorLayer);

    }

    private renderDefaultCircles(longitudes: number[], latitudes: number[], circleOptions: CircleOptions, tooltips: any[]) {

        longitudes.forEach((lon, i) => {
            const lat = latitudes[i];
            if (isNaN(lon) || isNaN(lat)) {
                console.warn(`Skipping invalid point: lon = ${lon}, lat = ${lat}`);
                return;
            }

            const point = new Feature({
                geometry: new Point(fromLonLat([lon, lat])),
                radius: circleOptions.minRadius,
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

    // Create proportional circle legend
    private createProportionalCircleLegend(
        containerId: string,
        sizeValues: number[],
        radii: number[],
        opacity: number,
        backgroundColor: string,
        bottomMargin: string,
        legendTitle: string,  
        circleOptions: CircleOptions,      
        formatTemplate: string = "{:.0f}"
    ) {
        const container = document.getElementById(containerId);

        if (!container) {
            console.error("Container not found");
            return;
        }

        // compute container background color and opacity        
        const bgColor = hexToRgba(backgroundColor, opacity)

        // Set background for container and SVG
        container.style.backgroundColor = bgColor;
        container.style.bottom = bottomMargin;

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.style.display = "block"; // Ensure SVG takes up the full container width/height

        // Clear previous content
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        // Set container styles for centering
        container.style.display = "flex";
        container.style.flexDirection = "column"; // Stack the title and legend items vertically
        container.style.alignItems = "flex-start"; // Align the items to the left by default
        container.style.height = "auto"; // Let container height adjust dynamically
        container.style.padding = "5px"; // Uniform padding around container     


        // Add title to the legend with customizable alignment
        const title = document.createElement("div");
        title.textContent = legendTitle;
        title.style.color = circleOptions.legendTitleColor;
        title.style.fontSize = "12px";
        title.style.fontWeight = "bold";
        title.style.marginBottom = "5px";

        // Append the title to the legend
        container.appendChild(title);

        // Get legend data using the provided function
        const legendData = getProportionalCircleLegendData(sizeValues, radii);

        if (!legendData || legendData.length === 0) {
            console.error("Invalid legend data");
            return;
        }

        // Define padding around circles
        const padding = 10;

        // Determine the maximum radius for alignment
        const maxRadius = Math.max(...legendData.map((item) => item.radius));

        // Positioning variables
        const centerX = maxRadius + padding; // X position for all circles
        const bottomY = 2 * maxRadius + padding; // Y position of the largest circle's bottom
        let maxLabelWidth = 0; // Track the maximum label width

        // Add circles, labels, and leader lines to the legend
        legendData.forEach((item) => {
            // Calculate the Y position so all circles are aligned at the bottom
            const currentY = bottomY - item.radius;

            // Draw the circle
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", centerX.toString());
            circle.setAttribute("cy", currentY.toString());
            circle.setAttribute("r", item.radius.toString());
            circle.setAttribute("stroke", circleOptions.legendItemsColor);
            circle.setAttribute("fill", "none");

            svg.appendChild(circle);

            // Calculate label position
            const labelX = centerX + maxRadius + 20;
            const labelY = currentY - item.radius;

            // Add the leader line
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", centerX.toString());
            line.setAttribute("y1", (currentY - item.radius).toString());
            line.setAttribute("x2", (labelX - 3).toString());
            line.setAttribute("y2", labelY.toString());
            line.setAttribute("stroke", circleOptions.legendItemsColor);
            line.setAttribute("stroke-width", "1");

            svg.appendChild(line);

            const formattedLabel = formatValue(item.size, formatTemplate);

            // Add the corresponding label (aligned to the top of the circle)
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", labelX.toString());
            text.setAttribute("y", labelY.toString());
            text.setAttribute("alignment-baseline", "middle");
            text.setAttribute("fill", circleOptions.legendItemsColor)
            text.textContent = `${formattedLabel}`;

            svg.appendChild(text);

            // Measure the label width
            const tempLabel = document.createElement("div");
            tempLabel.style.position = "absolute";
            tempLabel.style.visibility = "hidden";
            tempLabel.style.whiteSpace = "nowrap";
            tempLabel.textContent = `${item.size}`;
            document.body.appendChild(tempLabel);

            const labelWidth = tempLabel.offsetWidth;
            maxLabelWidth = Math.max(maxLabelWidth, labelWidth);

            document.body.removeChild(tempLabel);
        });

        // Calculate the viewBox dimensions based on the legend size and labels
        const svgWidth = centerX + maxRadius + maxLabelWidth + padding * 2 + 20; // 20px for spacing between circles and labels
        const svgHeight = bottomY + padding;

        // Apply viewBox and dimensions
        svg.setAttribute("width", `${svgWidth}px`);
        svg.setAttribute("height", `${svgHeight}px`);
        svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
        svg.setAttribute("preserveAspectRatio", "xMinYMin meet"); // Preserve scaling

        // Append the SVG to the container
        container.appendChild(svg);
    }

    private renderChoroplethLayer(categorical: any, choroplethOptions: ChoroplethOptions) {

        if (!categorical.values || categorical.values.length === 0) {
            console.warn("Measures not found.");
            this.choroplethVectorSource.clear();
            return;
        }

        const AdminPCodeNameIDCategory = categorical.categories.find(c => c.source?.roles && c.source.roles['AdminPCodeNameID']);

        if (!AdminPCodeNameIDCategory) {
            console.warn("PCodes not found.");
            this.choroplethVectorSource.clear();
            return;
        }

        const colorMeasure = categorical.values.find(c => c.source?.roles && c.source.roles['Color']);

        if (!colorMeasure) {
            console.warn("Color Measure not found.");
            this.choroplethVectorSource.clear();
            return;
        }

        let serviceUrl: string = '';

        if (choroplethOptions.selectedLocationFileSource == "hdx") {
            serviceUrl = `${constants.HDX_ADMIN_BOUNDARY_GEOSERVICE_BASEURL}/${choroplethOptions.countryISO3Code}_pcode/MapServer/${choroplethOptions.adminLevel}/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson`;

        }
        else if (choroplethOptions.selectedLocationFileSource == "github") {

            if (choroplethOptions.githubRawFilePath.length > 0) {
                serviceUrl = `https://raw.githubusercontent.com/${choroplethOptions.githubRawFilePath}`;

            } else {
                console.log(' File Path not provided')
            }

        }
        else {

            return; //handle other file sources
        }

        const cacheKey = `${choroplethOptions.countryISO3Code}_${choroplethOptions.adminLevel}`;

        const maxAge = 3600000; // Cache expiry time (1 hour)

        fetchAndCacheGeoJsonAdminBoundary(serviceUrl, cacheKey, maxAge)
            .then(geojsonData => {
                this.createChoroplethLayer(geojsonData, AdminPCodeNameIDCategory, colorMeasure, choroplethOptions);
            })
            .catch(error => {
                console.error("Error fetching GeoJSON data:", error);
            });
    }

    // Function to process the GeoJSON data & create choropleth
    private createChoroplethLayer(geojsonData: any, category: any, measure: any, options: ChoroplethOptions): void {

        this.choroplethVectorSource.clear(); // Clear existing features

        // get pcodes
        const pCodes = category.values as string[];

        if (!pCodes || options.adminLevel.length === 0 || options.countryISO3Code.length === 0) {
            console.warn("No PCodes or Admin level or Country iso3 code found. Exiting...");
            return;
        }

        const validPCodes = pCodes.filter(pcode => {
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

        const colorValues: number[] = measure.values;

        const classBreaks = this.getClassBreaks(colorValues, options);

        const colorScale = this.getColorScale(classBreaks, options);

        let pcodeKey = `ADM${options.adminLevel}_PCODE`; // Use the appropriate key based on the admin level

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

                    if (value < classBreaks[0]) {
                        color = colorScale[0];
                    } else if (value > classBreaks[classBreaks.length - 1]) {
                        color = colorScale[colorScale.length - 1];
                    } else {
                        for (let i = 0; i < classBreaks.length - 1; i++) {
                            if (value >= classBreaks[i] && value <= classBreaks[i + 1]) {
                                color = colorScale[i];
                                break;
                            }
                        }
                    }

                    return new Style({
                        fill: new Fill({
                            color: color
                        }),
                        stroke: new Stroke({
                            color: options.strokeColor,
                            width: options.strokeWidth
                        })
                    });

                    //return this.choroplethStyle;
                } else {
                    // Return null to skip rendering this feature
                    return null;
                }
            },
            opacity: options.layerOpacity
        });

        this.fitMapToFeatures();

        this.map.addLayer(this.choroplethVectorLayer);

        if (options.showLegend) {

            this.createChoroplethLegend(colorValues, classBreaks, colorScale, options, "inside");

        } else {
            const legend = document.getElementById("legend");
            if (legend) {
                legend.style.display = "none"; // Hide the legend
            }
        }

    }


    private createChoroplethLegend(
        colorValues: number[],
        classBreaks: number[],
        colorScale: any,
        options: ChoroplethOptions,
        legendLabelPosition: "top" | "inside" | "bottom" = "inside",
        formatTemplate: string = "{:.0f}",
        titleAlignment: "left" | "center" | "right" = "left",
        gapSize: number = 2.5

    ): void {

        const uniqueColorValues: number[] = [...new Set(colorValues)].sort((a, b) => a - b);;

        const legendContainer = document.getElementById("legend");
        if (!legendContainer) return;

        // Clear existing legend
        while (legendContainer.firstChild) {
            legendContainer.removeChild(legendContainer.firstChild);
        }

        // compute legend background color and opacity
        const opacity = options.legendBackgroundOpacity / 100
        const bgColor = hexToRgba(options.legendBackgroundColor, opacity)

        // Style the legend container
        legendContainer.style.display = "flex";
        legendContainer.style.flexDirection = "column";
        legendContainer.style.alignItems = "flex-start";
        legendContainer.style.gap = "5px";
        legendContainer.style.backgroundColor = bgColor,//"rgba(255, 255, 255, 0.5)"; 
        legendContainer.style.border = "none";
        legendContainer.style.padding = "5px";

        // Add title to the legend with customizable alignment
        const title = document.createElement("div");
        title.textContent = options.legendTitle;
        title.style.color = options.legendTitleColor;
        title.style.fontSize = "12px";
        title.style.fontWeight = "bold";
        title.style.marginBottom = "5px";

        // Align the title based on user selection
        title.style.textAlign = titleAlignment;

        // Align the title itself depending on the alignment choice
        if (titleAlignment === "left") {
            title.style.marginLeft = "0";
        } else if (titleAlignment === "center") {
            title.style.marginLeft = "auto";
            title.style.marginRight = "auto";
        } else if (titleAlignment === "right") {
            title.style.marginLeft = "auto";
        }

        // Append the title to the legend
        legendContainer.appendChild(title);

        // Create horizontal layout for legend items
        const itemsContainer = document.createElement("div");
        itemsContainer.style.display = "flex";
        itemsContainer.style.flexDirection = "row";
        itemsContainer.style.alignItems = "flex-start";
        itemsContainer.style.gap = `${gapSize}px`;

        if (options.classifyData) {
            // Classified Mode
            for (let i = 0; i < classBreaks.length - 1; i++) {
                const color = colorScale[i];
                let labelText = "";

                // Determine label text based on index
                labelText = `${formatValue(classBreaks[i], formatTemplate)} - ${formatValue(classBreaks[i + 1], formatTemplate)}`;

                // Create legend item
                const legendItem = createChoroplethLegendItem(labelText, color, options.legendLabelsColor, legendLabelPosition);
                itemsContainer.appendChild(legendItem);
            }
        } else {
            // Unique Value Mode
            for (let i = 0; i < uniqueColorValues.length; i++) {
                const uniqueValue = uniqueColorValues[i];
                const color = colorScale[i]; // Get color from colorScale
                const labelText = formatValue(uniqueValue, formatTemplate); // Format the unique value

                // Create legend item
                const legendItem = createChoroplethLegendItem(labelText, color, options.legendLabelsColor, legendLabelPosition);
                itemsContainer.appendChild(legendItem);
            }
        }

        // Append the items container to the legend
        legendContainer.appendChild(itemsContainer);

        // Ensure the legend is visible
        legendContainer.style.display = "flex";
    }

    private getClassBreaks(colorValues: number[], choroplethOptions: ChoroplethOptions): number[] {

        const numValues = new Set(colorValues).size; // Get the number of unique values

        if (choroplethOptions.classifyData) {
            // Adjust the number of classes if it exceeds the number of unique values
            const adjustedClasses = Math.min(choroplethOptions.classes, numValues);

            if (numValues <= 2) {
                // Handle cases with less than or equal to two unique values
                return Array.from(new Set(colorValues)).sort((a, b) => a - b);
            } else {
                // More than two unique values: Use the existing classification methods
                if (choroplethOptions.classificationMethod === 'j') {
                    return ss.jenks(colorValues, adjustedClasses); // Use adjustedClasses

                } if (choroplethOptions.classificationMethod === 'k') {

                    const clusters = ss.ckmeans(colorValues, adjustedClasses);

                    // Extract the maximum value from each cluster
                    const maxValues = clusters.map(cluster => Math.max(...cluster));

                    // Sort the maximum values in ascending order
                    maxValues.sort((a, b) => a - b);

                    // Construct the class breaks array
                    const classBreaks = [Math.min(...colorValues), ...maxValues];

                    return classBreaks;
                }
                else {
                    return chroma.limits(colorValues, choroplethOptions.classificationMethod as 'q' | 'e' | 'l', adjustedClasses); // Use adjustedClasses
                }
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

            return this.colorRampGenerator.generateColorRamp(classBreaks, choroplethOptions.classes);
        } else {
            return chroma.scale([choroplethOptions.minColor, choroplethOptions.midColor, choroplethOptions.maxColor])
                .mode('lab')
                .domain(classBreaks)
                .colors(choroplethOptions.classes);
        }
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

    private static getTooltipData(value: any): VisualTooltipDataItem[] {
        return [{
            displayName: value.category,
            value: value.value.toString(),
            color: value.color
        }];
    }

}

// Helper function to create a legend item (extracted for reuse)
function createChoroplethLegendItem(labelText: string, boxColor: string, labelColor: string, labelPosition: "top" | "inside" | "bottom"): HTMLElement {
    const legendItem = document.createElement("div");
    legendItem.style.display = "flex";
    legendItem.style.flexDirection = "column";
    legendItem.style.alignItems = "center";

    // Calculate the dynamic width of the color box
    const boxWidth = `${labelText.length * 5 + 10}px`;

    // Create color box
    const colorBox = document.createElement("div");
    colorBox.style.position = "relative";
    colorBox.style.width = boxWidth;
    colorBox.style.height = "20px";
    colorBox.style.backgroundColor = boxColor;
    colorBox.style.textAlign = "center";
    colorBox.style.display = "flex";
    colorBox.style.justifyContent = "center";
    colorBox.style.alignItems = labelPosition === "inside" ? "center" : "flex-start";

    // Add label
    const label = document.createElement("span");
    label.textContent = labelText;
    label.style.color = labelColor;//labelPosition === "inside" ? "#fff" : "#000";
    label.style.fontSize = "10px";

    // Append label based on position
    if (labelPosition === "top") {
        label.style.marginBottom = "5px";
        legendItem.appendChild(label);
        legendItem.appendChild(colorBox);
    } else if (labelPosition === "bottom") {
        label.style.marginTop = "5px";
        legendItem.appendChild(colorBox);
        legendItem.appendChild(label);
    } else {
        colorBox.appendChild(label);
        legendItem.appendChild(colorBox);
    }

    return legendItem;
}

function formatValue(value: number, formatTemplate: string): string {
    let formattedValue: number;
    let suffix: string = "";

    // Step 1: Check the magnitude of the value and adjust accordingly
    if (value >= 1_000_000) {  // Millions
        formattedValue = value / 1_000_000;
        suffix = "M";
    } else if (value >= 1_000) {  // Thousands
        formattedValue = value / 1_000;
        suffix = "k";
    } else {
        formattedValue = value;  // If less than 1,000, no adjustment needed
    }

    // Step 2: Handle dynamic formatting based on the template
    // Extract the decimal precision (e.g., ".1f" or ".2f")
    const match = formatTemplate.match(/{:(\.\d+f)}/);

    if (match) {
        // Extract the precision (e.g., '.1f', '.2f', etc.)
        const precision = match[1];

        // Apply the precision using toFixed or toPrecision
        if (precision === '.0f') {
            formattedValue = Math.round(formattedValue);  // No decimal places
        } else {
            const decimals = parseInt(precision.replace('.', '').replace('f', ''));
            formattedValue = parseFloat(formattedValue.toFixed(decimals));  // Format with decimal places
        }
    }

    // Step 3: Return the formatted value with the suffix
    return `${formattedValue}${suffix}`;
}

function hexToRgba(hex, opacity) {
    // Remove the '#' character if it exists
    hex = hex.replace("#", "");

    // Ensure the hex code is the correct length
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    // Convert the hex code to RGB values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Return the RGBA value
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const memoryCache: Record<string, { data: any; timestamp: number }> = {};

// Cache GeoJSON data, avoiding overwriting if it's a duplicate
async function cacheGeoJsonDataOld(key: string, data: any): Promise<void> {
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


// Initialize IndexedDB
function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("GeoJsonCacheDB", 1);

        request.onupgradeneeded = (event) => {
            const db = request.result;
            if (!db.objectStoreNames.contains("geoJsonData")) {
                db.createObjectStore("geoJsonData", { keyPath: "key" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function cacheGeoJsonData(key: string, data: any): Promise<void> {
    try {
        const db = await openDatabase();

        // Start a transaction and get the object store
        const transaction = db.transaction("geoJsonData", "readwrite");
        const store = transaction.objectStore("geoJsonData");

        // Check for existing data
        const existingData = await new Promise<any | undefined>((resolve) => {
            const getRequest = store.get(key);
            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => resolve(undefined);
        });

        if (existingData && existingData.data === data) {
            console.log("Duplicate cache entry in IndexedDB. Skipping cache update.");
            return;
        }

        // Add or update the data
        const cacheEntry = { key, data, timestamp: Date.now() };
        const putRequest = store.put(cacheEntry);

        putRequest.onsuccess = () => {
            console.log("GeoJSON data cached in IndexedDB.");
        };

        putRequest.onerror = (e) => {
            console.error("Error caching data in IndexedDB. Falling back to memory cache.", e);
            memoryCache[key] = { data, timestamp: Date.now() };
            console.log("GeoJSON data cached in memory.");
        };

        // Close the transaction
        transaction.oncomplete = () => db.close();
    } catch (error) {
        if (error.name === "SecurityError") {
            console.warn("IndexedDB is restricted in this context (e.g., file:// or incognito). Using memory cache.");
        } else {
            console.error("IndexedDB error. Falling back to memory cache.", error);
        }

        // Memory cache fallback
        const existingCache = memoryCache[key];
        if (existingCache && existingCache.data === data) {
            console.log("Duplicate cache entry in memory. Skipping cache update.");
            return;
        }

        memoryCache[key] = { data, timestamp: Date.now() };
        console.log("GeoJSON data cached in memory.");
    }
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
async function fetchAndCacheGeoJsonAdminBoundary(serviceUrl: string, cacheKey: string, maxAge: number = 3600000): Promise<any> {
    if (await isCacheExpired(cacheKey, maxAge)) {
        console.log("Fetching data from service...");
        const response = await fetch(serviceUrl);
        if (!response.ok) {
            console.log(`Failed to fetch GeoJSON data: ${response.statusText}`);
            return;
            //throw new Error(`Failed to fetch GeoJSON data: ${response.statusText}`);            
        }
        const geojsonData = await response.json();

        // Check if the fetched data is a valid GeoJSON object
        if (!isValidGeoJson(geojsonData)) {
            console.log("Fetched data is not a valid GeoJSON object.");
            return;
        }

        await cacheGeoJsonData(cacheKey, geojsonData);
        return geojsonData;
    }

    console.log("Using cached data.");
    return getCachedGeoJsonData(cacheKey);
}


// Helper function to validate GeoJSON data
function isValidGeoJson(data: any): boolean {
    if (!data || typeof data !== "object" || !data.type) {
        return false;
    }

    const validGeoJsonTypes = [
        "Feature",
        "FeatureCollection",
        "Point",
        "LineString",
        "Polygon",
        "MultiPoint",
        "MultiLineString",
        "MultiPolygon",
    ];

    if (!validGeoJsonTypes.includes(data.type)) {
        return false;
    }

    // Additional checks for "Feature" and "FeatureCollection"
    if (data.type === "Feature" && (!data.geometry || typeof data.geometry !== "object")) {
        return false;
    }

    if (data.type === "FeatureCollection" && (!Array.isArray(data.features))) {
        return false;
    }

    return true;
}

// function to get proportional circle legend data i.e min, medium and max
function getProportionalCircleLegendData(sizeValues: number[], radii: number[]) {
    if (sizeValues.length !== radii.length) {
        console.log("sizeValues and radii arrays must have the same length");
        return [];
    }

    // Sort by sizeValues
    const sortedData = sizeValues
        .map((size, index) => ({ size, radius: radii[index] }))
        .sort((a, b) => a.size - b.size);

    // Extract min and max
    const min = sortedData[0];
    const max = sortedData[sortedData.length - 1];

    // Compute medium as half of max size, rounded to the nearest thousand
    const mediumSize = Math.round((max.size / 2) / 1000) * 1000;
    const mediumRadius = (max.radius / max.size) * mediumSize; // Scale radius proportionally

    const medium = { size: mediumSize, radius: mediumRadius };

    return [min, medium, max];
}


