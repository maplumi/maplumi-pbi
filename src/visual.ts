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

import { createTooltipServiceWrapper, TooltipEventArgs, ITooltipServiceWrapper, TooltipEnabledDataPoint } from "powerbi-visuals-utils-tooltiputils";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import PrimitiveValue = powerbi.PrimitiveValue;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

import { HumanitarianMapVisualFormattingSettingsModel } from "./settings";

import { Basemap } from "./basemap";

import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import { Overlay } from "ol";

import { fromLonLat } from "ol/proj";

import GeoJSON from "ol/format/GeoJSON";
import TopoJSON from "ol/format/TopoJSON"
import { FeatureCollection } from "geojson";

import TileLayer from "ol/layer/Tile";
import { transform, transformExtent } from 'ol/proj.js';

import { easeOut } from "ol/easing";

import { defaults as defaultControls } from "ol/control";

import { MapboxVectorLayer } from "ol-mapbox-style";

import * as chroma from "chroma-js"; // Import chroma module
import * as ss from "simple-statistics";

import { BasemapOptions, ChoroplethLayerOptions, ChoroplethOptions, CircleLayerOptions, CircleOptions } from "./types";
import { ColorRampGenerator } from "./colors";

import { CircleLayer } from "./circleLayer";
import { ChoroplethLayer } from "./choroplethLayer";

import * as d3 from "d3";
import * as turf from "@turf/turf";

import * as util from "./utils"
import * as legend from "./legend";


interface TooltipDataItem {
    displayName: string;
    value: string;
    data: { displayName: string; value: any }[];
    // ... other properties you might need (header, color, etc.)
}

export class OpenMapVisual implements IVisual {

    private host: IVisualHost;
    private formattingSettingsService: FormattingSettingsService;
    private visualFormattingSettingsModel: HumanitarianMapVisualFormattingSettingsModel;

    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private tooltipService: powerbi.extensibility.ITooltipService;

    private container: HTMLElement;
    private svgContainer: HTMLElement;

    private loaderContainer: HTMLElement;
    private circleLegendContainer: HTMLElement;
    private choroplethLegendContainer: HTMLElement;

    private svgOverlay: SVGSVGElement;
    private svg: d3.Selection<SVGElement, unknown, HTMLElement, any>;

    private loaderOverlay: Overlay;
    private circleLegendOverlay: Overlay;
    private choroplethLegendOverlay: Overlay;

    private map: Map;
    private basemap: Basemap;
    private basemapLayer: TileLayer;
    private mapboxVectorLayer: MapboxVectorLayer;

    private circleLayer: CircleLayer;
    private choroplethLayer: ChoroplethLayer;

    private colorRampGenerator: ColorRampGenerator;
    private isDataLoading: boolean = false;

    private choroplethLegend: HTMLElement;
    private circleLegend: HTMLElement;

    private fitMapOptions: any;

    private memoryCache: Record<string, { data: any; timestamp: number }>;

    constructor(options: VisualConstructorOptions) {

        this.host = options.host;

        this.memoryCache = {};

        this.formattingSettingsService = new FormattingSettingsService();
        this.visualFormattingSettingsModel = new HumanitarianMapVisualFormattingSettingsModel();

        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService);;

        this.basemap = new Basemap();
        this.basemapLayer = this.basemap.getDefaultBasemap();

        this.container = options.element;

        // create loader/spinner element
        this.loaderContainer = document.createElement('div');
        this.loaderContainer.setAttribute('id', 'loader');
        this.loaderContainer.classList.add('loader');
        this.loaderContainer.style.border = '8px solid #f3f3f3';
        this.loaderContainer.style.borderRadius = '50%';
        this.loaderContainer.style.borderTop = '8px solid #3498db';
        this.loaderContainer.style.width = '40px';
        this.loaderContainer.style.height = '40px';
        this.loaderContainer.style.animation = 'spin 2s linear infinite';
        this.loaderContainer.style.position = 'absolute';
        this.loaderContainer.style.top = '50%';
        this.loaderContainer.style.left = '50%';
        this.loaderContainer.style.transform = 'translate(-50%, -50%)';
        this.loaderContainer.style.zIndex = '1000';
        this.loaderContainer.style.display = 'none'; // Initially hidden

        this.loaderContainer.style.pointerEvents = 'none';

        this.container.appendChild(this.loaderContainer);

        // Ensure the circle legend container is also appended to the same parent
        this.circleLegendContainer = document.createElement("div");
        this.circleLegendContainer.setAttribute("id", "circleLegend");
        this.circleLegendContainer.style.position = "absolute";
        this.circleLegendContainer.style.zIndex = "1000";
        this.circleLegendContainer.style.bottom = "40px";
        this.circleLegendContainer.style.left = "10px";
        this.circleLegendContainer.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
        this.circleLegendContainer.style.borderRadius = "4px";
        this.circleLegendContainer.style.display = "none"; // Hidden by default

        const circleLegendTitle = document.createElement("h4");
        circleLegendTitle.textContent = "Legend";

        this.circleLegendContainer.appendChild(circleLegendTitle);

        this.circleLegendContainer.style.pointerEvents = 'none';

        this.container.appendChild(this.circleLegendContainer);


        // Ensure the choropleth legend container is also appended to the same parent
        this.choroplethLegendContainer = document.createElement("div");
        this.choroplethLegendContainer.setAttribute("id", "choroplethLegend");
        this.choroplethLegendContainer.style.position = "absolute";
        this.choroplethLegendContainer.style.zIndex = "1000";
        this.choroplethLegendContainer.style.top = "10px";
        this.choroplethLegendContainer.style.right = "10px";
        this.choroplethLegendContainer.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
        this.choroplethLegendContainer.style.display = "none"; // Hidden by default

        const legendTitle = document.createElement("h4");
        legendTitle.textContent = "Legend";

        this.choroplethLegendContainer.appendChild(legendTitle);

        this.choroplethLegendContainer.style.pointerEvents = 'none';

        this.container.appendChild(this.choroplethLegendContainer);

        // Initialize the map
        this.map = new Map({
            target: this.container,
            layers: [this.basemapLayer],
            view: new View({
                center: fromLonLat([0, 0]), // Center the map at the origin
                zoom: 2
            }),
            controls: defaultControls({
                attribution: true, // Ensure attribution control is enabled
                attributionOptions: {
                    collapsible: false, // Keep the attribution always visible
                },
            }),
        });

        // Get legend containers by Id
        this.choroplethLegend = document.getElementById("choroplethLegend");
        this.circleLegend = document.getElementById("circleLegend");

        // Fit map options
        this.fitMapOptions = {
            padding: [50, 50, 50, 50],
            duration: 1000,
            easing: easeOut,
        };

        // svg layer overlay
        this.svgOverlay = this.container.querySelector('svg');
        if (!this.svgOverlay) {
            this.svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            this.svgOverlay.id = 'svgOverlay'
            this.svgOverlay.style.position = 'absolute';
            this.svgOverlay.style.top = '0';
            this.svgOverlay.style.left = '0';
            this.svgOverlay.style.width = '100%';
            this.svgOverlay.style.height = '100%';
            this.svgOverlay.style.pointerEvents = 'none'; // Let the map handle pointer events by default
        }

        this.svg = d3.select(this.svgOverlay);

        this.svgContainer = document.createElement('div'); // svg node container      

        console.log("Visual initialized.");
    }

    update(options: VisualUpdateOptions) {

        console.log("Update invoked.");

        this.svg.selectAll('*').remove();

        this.svgOverlay.style.display = 'none';

        // Retrieve the model and settings
        this.visualFormattingSettingsModel = this.getFormattingSettings(options);
        const basemapOptions = this.getBasemapOptions();
        const circleOptions = this.getCircleOptions();
        const choroplethOptions = this.getChoroplethOptions();

        this.colorRampGenerator = new ColorRampGenerator(choroplethOptions.colorRamp);

        const dataView = options.dataViews[0];

        // Check data validity
        if (!dataView || !dataView.categorical) {
            console.log("No categorical data found.");

            this.svg.selectAll('*').remove();

            return;
        }

        this.updateBasemap(basemapOptions);

        if (circleOptions.layerControl) {
           // this.loaderContainer.style.display = 'block'; // Show the loader
            this.renderCircleLayer(dataView.categorical, circleOptions);
            //this.loaderContainer.style.display = 'none'; // Hide the loader
        }

        if (choroplethOptions.layerControl) {
           // this.loaderContainer.style.display = 'block'; // Show the loader
            this.renderChoroplethLayer(dataView.categorical, choroplethOptions);
           // this.loaderContainer.style.display = 'none'; // Hide the loader
        }

        

        // Force the map to update its size, for example when the visual window is resized
        this.map.updateSize();

    }

    private updateBasemap(basemapOptions: BasemapOptions): void {

        // Dictionary to store default attributions
        const attributions: Record<string, string> = {
            mapbox: "© Mapbox © OpenStreetMap",
            openstreetmap: "© OpenStreetMap",
        };

        // Retrieve the appropriate attribution
        const defaultAttribution = attributions[basemapOptions.selectedBasemap] || "";
        let attribution = defaultAttribution;

        // Add custom attribution if provided
        if (basemapOptions.customMapAttribution) {
            attribution = `${basemapOptions.customMapAttribution} ${defaultAttribution}`;
        }

        // Determine the layer based on the selected basemap
        let newLayer: any = null;
        if (basemapOptions.selectedBasemap === "mapbox") {
            this.mapboxVectorLayer = this.basemap.getMapboxBasemap(basemapOptions);
            newLayer = this.mapboxVectorLayer;
        } else if (basemapOptions.selectedBasemap === "openstreetmap") {
            this.basemapLayer = this.basemap.getBasemap(basemapOptions);
            newLayer = this.basemapLayer;
        } else if (basemapOptions.selectedBasemap === "none") {
            // remove basemap
        }

        // Update the layer and attribution if a valid layer was found
        if (newLayer) {
            newLayer.getSource()?.setAttributions(attribution);
            this.map.getLayers().setAt(0, newLayer);
        }
    }

    private renderCircleLayer(
        categorical: any,
        circleOptions: CircleOptions
    ) {

        let longitudes: number[] | undefined;
        let latitudes: number[] | undefined;
        let circleSizeValues: number[] | undefined;
        let minCircleSizeValue: number | undefined;
        let maxCircleSizeValue: number | undefined;
        let circleScale: number | undefined;

        if (circleOptions.layerControl) {

            this.svg.select('#circles-group').remove();
            this.svgOverlay.style.display = 'block';

            console.log('Rendering circles...')

            const lonCategory = categorical?.categories?.find((c) => c.source?.roles && c.source.roles["Longitude"]);
            const latCategory = categorical?.categories?.find((c) => c.source?.roles && c.source.roles["Latitude"]);

            if (lonCategory && latCategory) {

                // Extract tooltips
                const tooltips = this.extractTooltips(categorical);

                longitudes = lonCategory.values as number[];
                latitudes = latCategory.values as number[];

                if (longitudes.length !== latitudes.length) {

                    console.warn("Longitude and Latitude have different lengths.");

                } else {

                    // Handle Circle Size Measure or default size
                    const CircleSizeMeasure = categorical?.values?.find((c) => c.source?.roles && c.source.roles["Size"]);

                    circleSizeValues = CircleSizeMeasure.values as number[];
                    minCircleSizeValue = Math.min(...circleSizeValues);
                    maxCircleSizeValue = Math.max(...circleSizeValues);
                    circleScale = (circleOptions.maxRadius - circleOptions.minRadius) / (maxCircleSizeValue - minCircleSizeValue);

                    const circleLayerOptions: CircleLayerOptions = {
                        // Required properties for the CircleLayer
                        longitudes: longitudes,
                        latitudes: latitudes,

                        // Circle customization options
                        circleOptions: circleOptions,

                        // Optional properties for proportional circles
                        circleSizeValues: circleSizeValues,
                        minCircleSizeValue: minCircleSizeValue,
                        circleScale: circleScale,
                        svg: this.svg,
                        svgContainer: this.svgContainer,
                        zIndex: 5

                        // OpenLayers-specific options
                        // opacity: 1,                                // Layer opacity
                        // visible: true,                             // Visibility of the layer

                    };

                    this.circleLayer = new CircleLayer(circleLayerOptions);

                    this.map.addLayer(this.circleLayer);

                    this.addCircleLayerEvents(this.map, this.circleLayer);

                    // Calculate extent of features
                    const extent = this.circleLayer.getFeaturesExtent();

                    this.map.getView().fit(extent, this.fitMapOptions);


                    // Render legend if proportional circles are used
                    if (circleOptions.showLegend && circleSizeValues && circleSizeValues.length > 0) {

                        let radii: number[] | undefined;

                        longitudes.forEach((i) => {

                            // Calculate radius: proportional if circleSizeValues are provided, otherwise default to minRadius
                            const radius = circleSizeValues && minCircleSizeValue !== undefined && circleScale !== undefined
                                ? circleOptions.minRadius + (circleSizeValues[i] - minCircleSizeValue) * circleScale
                                : circleOptions.minRadius;

                            radii.push(radius);

                        });

                        legend.createProportionalCircleLegend(
                            this.circleLegendContainer,
                            circleSizeValues,
                            radii,
                            circleOptions.legendTitle,
                            circleOptions
                        );
                    }

                }

            } else {

                console.warn("Both Longitude and Latitude roles must be assigned.");
                this.svg.select('#circles-group').remove();

            }
        } else {
            // we are not rendering circles
            this.svg.select('#circles-group').remove();
        }
    }

    private renderChoroplethLayer(
        categorical: any,
        choroplethOptions: ChoroplethOptions
    ) {

        this.svg.select('#choropleth-group').remove();
        this.svgOverlay.style.display = 'flex';

        console.log('Rendering choropleth...');

        // Validate input data
        if (!categorical.values || categorical.values.length === 0) {
            console.warn("Measures not found.");
            //this.svg.selectAll('g').remove(); // set group selection
            return;
        }

        const AdminPCodeNameIDCategory = categorical.categories.find(
            (c) => c.source?.roles && c.source.roles["AdminPCodeNameID"]
        );

        if (!AdminPCodeNameIDCategory) {
            console.warn("Admin PCode/Name/ID not found.");
            //this.svg.selectAll('g').remove(); // set group selection
            return;
        }

        const colorMeasure = categorical.values.find(
            (c) => c.source?.roles && c.source.roles["Color"]
        );

        if (!colorMeasure) {
            console.warn("Color Measure not found.");
            //this.svg.selectAll('g').remove(); // set group selection
            return;
        }

        const serviceUrl: string = choroplethOptions.topoJSON_geoJSON_FileUrl;
        const cacheKey = `${choroplethOptions.locationPcodeNameId}`;
        const CACHE_EXPIRY_MS = 3600000; // 1 hour

        try {

            d3.json(serviceUrl).then(data => {

                // handle topojson
                let geojson: FeatureCollection = {
                    type: "FeatureCollection",
                    features: []
                };

                if (util.isTopoJSON(data)) {

                    geojson = util.convertSingleLayerTopoJSONToGeoJSON(data);

                } else {

                    geojson = data as FeatureCollection;
                }


                const turfOptions = { tolerance: 0.01, highQuality: false };

                const tolerance = 0.01;
                const highQuality = false;

               // const simplifiedGeo = turf.simplify(geojson, tolerance, highQuality);


                this.renderChoropleth(geojson, AdminPCodeNameIDCategory, colorMeasure, choroplethOptions);

            })

        } catch (error) {
            console.error("Error fetching GeoJSON data:", error);
        }


    }

    private renderChoropleth(geodata: any, category: any, measure: any, options: ChoroplethOptions) {

        // Get PCodes (this is the category/feature identifier)
        const pCodes = category.values as string[];
        if (!pCodes || pCodes.length === 0) {
            console.warn("No PCodes found. Exiting...");
            return;
        }

        // Filter valid PCodes
        const validPCodes = pCodes.filter((pcode) => pcode);
        if (validPCodes.length === 0) {
            console.warn("No valid PCodes found. Exiting...");
            return;
        }

        const colorValues: number[] = measure.values;
        const classBreaks = this.getClassBreaks(colorValues, options);
        const colorScale = this.getColorScale(classBreaks, options);
        const pcodeKey = options.locationPcodeNameId;

        // Filter GeoJSON features based on valid PCodes
        const filteredGeoData = {
            ...geodata,
            features: geodata.features.filter((feature: any) =>
                validPCodes.includes(feature.properties[pcodeKey])
            )
        };

        const choroplethLayerOptions : ChoroplethLayerOptions = {

            geojson: filteredGeoData,
            colorScale: (value: any) => this.getColorForValue(value, classBreaks, colorScale),
            dataKey: pcodeKey,
            svg: this.svg,
            svgContainer: this.svgContainer,
            zIndex: 5
        }

        this.choroplethLayer = new ChoroplethLayer(choroplethLayerOptions);

        const extent = this.choroplethLayer.getFeaturesExtent();

        this.map.getView().fit(extent, this.fitMapOptions);

        this.map.addLayer(this.choroplethLayer);

        this.addChoroplethLayerEvents(this.map, this.choroplethLayer);

        //const svg = this.choroplethLayer.getSvg(); // Get the SVG element

        // // Update the legend
        // if (options.showLegend) {

        //     legend.createChoroplethLegend(
        //         this.choroplethLegendContainer,
        //         colorValues,
        //         classBreaks,
        //         colorScale,
        //         options,
        //         "top"
        //     );

        // } else {

        //     this.choroplethLegendContainer.style.display = "none"; // Hide the legend
        // }



    }

    private addChoroplethLayerEvents(map: Map, svgLayer: ChoroplethLayer) {

        const svg = svgLayer.getSvg();

        // Handle single click on map
        map.on('singleclick', (event) => {
            const [mouseX, mouseY] = event.pixel; // Mouse position in pixels

            // Handle choropleth click event
            svg.selectAll('path').each(function () {
                const path = d3.select(this);
                const bounds = path.node().getBoundingClientRect();
                const pathX = bounds.left;
                const pathY = bounds.top;
                const pathWidth = bounds.width;
                const pathHeight = bounds.height;

                // Check if the mouse click is within the bounds of the path
                if (
                    mouseX >= pathX && mouseX <= pathX + pathWidth &&
                    mouseY >= pathY && mouseY <= pathY + pathHeight
                ) {
                    // Choropleth feature clicked! Perform your action here
                    const feature = path.datum() as GeoJSON.Feature<GeoJSON.GeometryObject, { [key: string]: any }>;
                    //const dataKey = (svgLayer.options as ChoroplethLayerOptions).dataKey;
                    //const value = feature.properties[dataKey];

                    //console.log(`Clicked choropleth: Value = ${value}`);

                    // Change the fill color for clicked choropleth feature
                    path.attr('fill', 'blue');
                }
            });

        });

        // Handle pointer movement over the map
        map.on('pointermove', (event) => {
            const [mouseX, mouseY] = event.pixel; // Mouse position in pixels

            // Handle pointer movement over choropleth features
            svg.selectAll('path').each(function () {
                const path = d3.select(this);
                const bounds = path.node().getBoundingClientRect();
                const pathX = bounds.left;
                const pathY = bounds.top;
                const pathWidth = bounds.width;
                const pathHeight = bounds.height;

                if (
                    mouseX >= pathX && mouseX <= pathX + pathWidth &&
                    mouseY >= pathY && mouseY <= pathY + pathHeight
                ) {
                    // Mouse is over the choropleth feature
                    path.attr('fill', 'red');
                } else {
                    // Mouse is outside the choropleth feature
                    const feature = path.datum() as GeoJSON.Feature<GeoJSON.GeometryObject, { [key: string]: any }>;
                    //const colorScale = (canvasLayer.options as ChoroplethLayerOptions).colorScale;
                    //const dataKey = (canvasLayer.options as ChoroplethLayerOptions).dataKey;
                    //const color = colorScale(feature.properties[dataKey]);
                    //path.attr('fill', color); // Revert to original color
                }
            });

        });
    }

    private addCircleLayerEvents(map: Map, canvasLayer: CircleLayer) {

        const svg = canvasLayer.getSvg();

        // Helper function to check if a point is inside a circle
        const isPointInCircle = (mouseX: number, mouseY: number, circleX: number, circleY: number, radius: number) => {
            const dx = mouseX - circleX;
            const dy = mouseY - circleY;
            return dx * dx + dy * dy <= radius * radius;
        };

        // Handle single click on map
        map.on('singleclick', (event) => {
            const [mouseX, mouseY] = event.pixel; // Mouse position in pixels

            // Handle circle click event
            svg.selectAll('circle').each(function () {
                const circle = d3.select(this);
                const circleX = parseFloat(circle.attr('cx'));
                const circleY = parseFloat(circle.attr('cy'));
                const radius = parseFloat(circle.attr('r'));

                if (isPointInCircle(mouseX, mouseY, circleX, circleY, radius)) {
                    // Circle clicked! Perform your action here
                    const id = circle.attr('data-id');
                    const sizeValue = circle.attr('data-size-value');
                    const index = circle.attr('data-index');

                    console.log(`Clicked circle: ID = ${id}, SizeValue = ${sizeValue}, Index = ${index}`);

                    // Change the circle's fill color on click
                    circle.attr('fill', 'blue');
                }
            });

        });

        // Handle pointer movement over the map
        map.on('pointermove', (event) => {
            const [mouseX, mouseY] = event.pixel; // Mouse position in pixels

            // Handle pointer movement over circles
            svg.selectAll('circle').each(function () {
                const circle = d3.select(this);
                const circleX = parseFloat(circle.attr('cx'));
                const circleY = parseFloat(circle.attr('cy'));
                const radius = parseFloat(circle.attr('r'));

                if (isPointInCircle(mouseX, mouseY, circleX, circleY, radius)) {
                    // Mouse is over the circle
                    circle.attr('fill', 'red');
                } else {
                    // Mouse is outside the circle

                    const circleColor = (canvasLayer.options as CircleLayerOptions).circleOptions?.color || 'defaultColor';
                    circle.attr('fill', circleColor);
                }
            });

        });
    }

    // Helper to get color for a value based on class breaks
    private getColorForValue(value: number, classBreaks: number[], colorScale: string[]): string {
        if (value < classBreaks[0]) {
            return colorScale[0];
        } else if (value > classBreaks[classBreaks.length - 1]) {
            return colorScale[colorScale.length - 1];
        } else {
            for (let i = 0; i < classBreaks.length - 1; i++) {
                if (value >= classBreaks[i] && value <= classBreaks[i + 1]) {
                    return colorScale[i];
                }
            }
        }
        return "#009edb"; // Default color
    }

    private getValidPCodes(pCodes: string[]): string[] {
        return pCodes.filter((pcode) => {
            if (!pcode) {
                console.warn(`Skipping invalid PCode: ${pcode}`);
                return false;
            }
            return true;
        });
    }

    private parseBoundaryData(
        data: any,
        validPCodes: string[],
        pcodeKey: string
    ): any[] | null {
        let format;
        let features;

        if (util.isValidGeoJson(data)) {
            format = new GeoJSON();
        } else if (util.isValidTopoJson(data)) {
            format = new TopoJSON();
        } else {
            console.error("Input data is neither GeoJSON nor TopoJSON.");
            return null;
        }

        features = format.readFeatures(data, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
        });

        // Filter features by valid PCodes
        return features.filter((feature: any) =>
            validPCodes.includes(feature.get(pcodeKey))
        );
    }

    private getColorFromClassBreaks(
        value: number,
        classBreaks: number[],
        colorScale: string[]
    ): string {
        if (value < classBreaks[0]) return colorScale[0];
        if (value > classBreaks[classBreaks.length - 1]) return colorScale[colorScale.length - 1];

        for (let i = 0; i < classBreaks.length - 1; i++) {
            if (value >= classBreaks[i] && value <= classBreaks[i + 1]) {
                return colorScale[i];
            }
        }

        return "#009edb"; // Default color
    }

    private getClassBreaks(
        colorValues: number[],
        choroplethOptions: ChoroplethOptions
    ): number[] {
        const numValues = new Set(colorValues).size; // Get the number of unique values

        if (choroplethOptions.classifyData) {
            // Adjust the number of classes if it exceeds the number of unique values
            const adjustedClasses = Math.min(choroplethOptions.classes, numValues);

            if (numValues <= 2) {
                // Handle cases with less than or equal to two unique values
                return Array.from(new Set(colorValues)).sort((a, b) => a - b);
            } else {
                // More than two unique values: Use the existing classification methods
                if (choroplethOptions.classificationMethod === "j") {
                    return ss.jenks(colorValues, adjustedClasses); // Use adjustedClasses
                }
                if (choroplethOptions.classificationMethod === "k") {
                    const clusters = ss.ckmeans(colorValues, adjustedClasses);

                    // Extract the maximum value from each cluster
                    const maxValues = clusters.map((cluster) => Math.max(...cluster));

                    // Sort the maximum values in ascending order
                    maxValues.sort((a, b) => a - b);

                    // Construct the class breaks array
                    const classBreaks = [Math.min(...colorValues), ...maxValues];

                    return classBreaks;
                } else {
                    return chroma.limits(
                        colorValues,
                        choroplethOptions.classificationMethod as "q" | "e" | "l",
                        adjustedClasses
                    ); // Use adjustedClasses
                }
            }
        } else {
            return Array.from(new Set(colorValues)).sort((a, b) => a - b);
        }
    }

    private getColorScale(
        classBreaks: any[],
        choroplethOptions: ChoroplethOptions
    ): any {
        if (choroplethOptions.usePredefinedColorRamp) {
            if (choroplethOptions.invertColorRamp) {
                this.colorRampGenerator.invertRamp();
            } else {
                this.colorRampGenerator = new ColorRampGenerator(
                    choroplethOptions.colorRamp
                );
            }

            return this.colorRampGenerator.generateColorRamp(
                classBreaks,
                choroplethOptions.classes
            );
        } else {
            return chroma
                .scale([
                    choroplethOptions.minColor,
                    choroplethOptions.midColor,
                    choroplethOptions.maxColor,
                ])
                .mode("lab")
                .domain(classBreaks)
                .colors(choroplethOptions.classes);
        }
    }

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
        const circleSettings =
            this.visualFormattingSettingsModel.ProportionalCirclesVisualCardSettings;
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
            legendTitleColor: circleSettings.legendTitleColor.value.value,
            legendItemsColor: circleSettings.legendItemsColor.value.value,
            legendBackgroundColor: circleSettings.legendBackgroundColor.value.value,
            legendBackgroundOpacity: circleSettings.legendBackgroundOpacity.value,
            legendBottomMargin: circleSettings.legendBottomMargin.value,
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

            locationPcodeNameId: choroplethLocationSettings.locationPcodeNameId.value.toString(),
            topoJSON_geoJSON_FileUrl: choroplethLocationSettings.topoJSON_geoJSON_FileUrl.value,

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
            legendBackgroundOpacity: choroplethLegendSettings.legendBackgroundOpacity.value,
        };
    }

    private extractTooltips(categorical: any) {

        if (categorical.values && categorical.values.length > 0) {
            const tooltipMeasure = categorical?.values?.find(
                (c) => c.source?.roles && c.source.roles["Tooltips"]
            );
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

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(
            this.visualFormattingSettingsModel
        );
    }

    public destroy(): void {

        this.map.setTarget(null);
        this.svg.selectAll('*').remove();

    }

}



