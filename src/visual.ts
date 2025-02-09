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
import ISelectionBuilder = powerbi.visuals.ISelectionIdBuilder;
import ISelectionManager = powerbi.extensibility.ISelectionManager;

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import PrimitiveValue = powerbi.PrimitiveValue;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

import { MaplyticsVisualFormattingSettingsModel } from "./settings";

import { Basemap } from "./basemap";

import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";

import { Interaction, DragZoom, MouseWheelZoom, PinchZoom, DoubleClickZoom } from 'ol/interaction';
import Collection from 'ol/Collection';
import Control from 'ol/control/Control';

import { fromLonLat, toLonLat } from 'ol/proj.js';

import { FeatureCollection } from "geojson";

import TileLayer from "ol/layer/Tile";

import XYZ from "ol/source/XYZ";

import { easeOut } from "ol/easing";

import { defaults as defaultControls } from "ol/control";

import { MapboxVectorLayer } from "ol-mapbox-style";

import * as chroma from "chroma-js"; // Import chroma module
import * as ss from "simple-statistics";

import { BasemapOptions, ChoroplethLayerOptions, ChoroplethOptions, CircleLayerOptions, CircleOptions, MapToolsOptions } from "./types";
import { ColorRampGenerator } from "./colors";

import { CircleLayer } from "./circleLayer";
import { ChoroplethLayer } from "./choroplethLayer";

import * as d3 from "d3";
import * as turf from "@turf/turf";

import * as util from "./utils"

import { LegendManager } from "./legend";
import { Extent } from "ol/extent";
import { MaplyticsAttributionControl } from "./attribution";

export class MaplyticsVisual implements IVisual {

    private host: IVisualHost;
    private formattingSettingsService: FormattingSettingsService;
    private visualFormattingSettingsModel: MaplyticsVisualFormattingSettingsModel;

    private tooltipServiceWrapper: ITooltipServiceWrapper;

    private selectionManager: ISelectionManager;
    private selectedIds: powerbi.visuals.ISelectionId[] = []; // Track selections

    private container: HTMLElement;
    private svgContainer: HTMLElement;

    private spinner: HTMLElement;
    private legendContainer: HTMLElement;
    private legendManager: LegendManager;

    private svgOverlay: SVGSVGElement;
    private svg: d3.Selection<SVGElement, unknown, HTMLElement, any>;

    private map: Map;
    private mapView: View;
    private basemap: Basemap;
    private basemapLayer: TileLayer;
    private mapboxVectorLayer: MapboxVectorLayer;

    private customAttributionControl: MaplyticsAttributionControl;

    // for basemap state management
    private currentBasemapType: string = "";
    private currentAttribution: string = "";
    private currentMapboxStyle: string = '';

    private mapToolsOptions: MapToolsOptions;

    private circleLayer: CircleLayer;
    private choroplethLayer: ChoroplethLayer;

    private colorRampGenerator: ColorRampGenerator;
    private isDataLoading: boolean = false;

    private mapExtent: Extent | undefined;
    private choroplethDisplayed: boolean = false;
    private fitMapOptions: any;

    private lockedView: View | null = null;
    private originalInteractions: Interaction[] = [];
    private originalControls: Control[] = [];

    private memoryCache: Record<string, { data: any; timestamp: number }>;

    private abortController: AbortController | null = null;

    constructor(options: VisualConstructorOptions) {

        this.host = options.host;

        this.memoryCache = {};

        this.formattingSettingsService = new FormattingSettingsService();
        this.visualFormattingSettingsModel = new MaplyticsVisualFormattingSettingsModel();

        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService);
        this.selectionManager = this.host.createSelectionManager();

        this.basemap = new Basemap();
        this.basemapLayer = this.basemap.getDefaultBasemap();

        this.container = options.element;

        // create loader/spinner element
        this.spinner = document.createElement('div');
        this.spinner.setAttribute('id', 'spinner');
        this.spinner.classList.add('loader');
        this.spinner.style.border = '8px solid #f3f3f3';
        this.spinner.style.borderRadius = '50%';
        this.spinner.style.borderTop = '8px solid #3498db';
        this.spinner.style.width = '40px';
        this.spinner.style.height = '40px';
        this.spinner.style.animation = 'spin 2s linear infinite';
        this.spinner.style.position = 'absolute';
        this.spinner.style.top = '50%';
        this.spinner.style.left = '50%';
        this.spinner.style.transform = 'translate(-50%, -50%)';
        this.spinner.style.zIndex = '1000';
        this.spinner.style.display = 'none'; // Initially hidden

        this.spinner.style.pointerEvents = 'none';

        this.container.appendChild(this.spinner);

        //legend container
        this.legendContainer = document.createElement("div");
        this.legendContainer.setAttribute("id", "legendContainer");
        this.legendContainer.style.position = "absolute";
        this.legendContainer.style.zIndex = "1000";
        this.legendContainer.style.display = "none"; // Hidden by default

        this.legendContainer.style.pointerEvents = 'none';

        this.container.appendChild(this.legendContainer);

        this.legendManager = new LegendManager(this.legendContainer);

        // create map view
        this.mapView = new View({
            center: fromLonLat([0, 0]), // Center the map at the origin
            zoom: 2
        });

        // Initialize the map
        this.map = new Map({
            target: this.container,
            layers: [this.basemapLayer],
            view: this.mapView,
            controls: defaultControls({
                attribution: false, // Ensure attribution control is enabled
                attributionOptions: {
                    collapsible: false, // Keep the attribution always visible
                },
            }),
        });

        // Fit map options
        this.fitMapOptions = {
            padding: [40, 40, 40, 40],
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
    }



    update(options: VisualUpdateOptions) {

        // Reset state on new update
        this.cleanupLayers();
        if (this.abortController) this.abortController.abort();

        this.svgOverlay.style.display = 'none';

        // Retrieve model and settings
        this.visualFormattingSettingsModel = this.getFormattingSettings(options);
        const basemapOptions = this.getBasemapOptions();
        const circleOptions = this.getCircleOptions();
        const choroplethOptions = this.getChoroplethOptions();
        this.mapToolsOptions = this.getMapToolsOptions();

        //update legend container
        this.legendContainer.style.background = this.mapToolsOptions.legendBackgroundColor;
        this.legendContainer.style.opacity = this.mapToolsOptions.legendBackgroundOpacity.toString();
        this.legendContainer.style.border = `${this.mapToolsOptions.legendBorderWidth}px solid ${this.mapToolsOptions.legendBorderColor}`;
        this.legendContainer.style.borderRadius = `${this.mapToolsOptions.legendBorderRadius}px`;
        this.legendContainer.style.marginBottom = `${this.mapToolsOptions.legendBottomMargin}px`;

        // // Reset all positioning properties
        // this.legendContainer.style.top = 'auto';
        // this.legendContainer.style.right = 'auto';
        // this.legendContainer.style.bottom = 'auto';
        // this.legendContainer.style.left = 'auto';

        // // Set new position
        // if (this.mapToolsOptions.legendPosition === 'top-right') {
        //     this.legendContainer.style.top = '10px';
        //     this.legendContainer.style.right = '10px';
        // } else if (this.mapToolsOptions.legendPosition === 'top-left') {
        //     this.legendContainer.style.top = '10px';
        //     this.legendContainer.style.left = '10px';
        // } else if (this.mapToolsOptions.legendPosition === 'bottom-right') {
        //     this.legendContainer.style.bottom = '10px';
        //     this.legendContainer.style.right = '10px';
        // } else { // bottom-left (default)
        //     this.legendContainer.style.bottom = '10px';
        //     this.legendContainer.style.left = '10px';
        // }

        // Reset all positioning properties first
        this.legendContainer.style.top = 'auto';
        this.legendContainer.style.right = 'auto';
        this.legendContainer.style.bottom = 'auto';
        this.legendContainer.style.left = 'auto';
        this.legendContainer.style.transform = 'none'; // Reset any previous transforms

        // Set new position
        if (this.mapToolsOptions.legendPosition === 'top-right') {
            this.legendContainer.style.top = '10px';
            this.legendContainer.style.right = '10px';
        } else if (this.mapToolsOptions.legendPosition === 'top-left') {
            this.legendContainer.style.top = '10px';
            this.legendContainer.style.left = '10px';
        } else if (this.mapToolsOptions.legendPosition === 'bottom-right') {
            this.legendContainer.style.bottom = '10px';
            this.legendContainer.style.right = '10px';
        } else if (this.mapToolsOptions.legendPosition === 'top-center') {
            this.legendContainer.style.top = '10px';
            this.legendContainer.style.left = '50%';
            this.legendContainer.style.transform = 'translateX(-50%)';
        } else if (this.mapToolsOptions.legendPosition === 'bottom-center') {
            this.legendContainer.style.bottom = '10px';
            this.legendContainer.style.left = '50%';
            this.legendContainer.style.transform = 'translateX(-50%)';
        } else { // bottom-left (default)
            this.legendContainer.style.bottom = '10px';
            this.legendContainer.style.left = '10px';
        }


        //this.spinner.style.display = 'block';  // Show spinner while loading data

        this.colorRampGenerator = new ColorRampGenerator(choroplethOptions.colorRamp);

        const dataView = options.dataViews[0];

        // Check data validity
        if (!dataView || !dataView.categorical) {
            console.log("No categorical data found.");

            return;
        }

        this.choroplethDisplayed = choroplethOptions.layerControl;

        this.updateBasemap(basemapOptions);

        // Handle layers
        this.handleLayer(
            choroplethOptions.layerControl,
            'choropleth-group',
            this.renderChoroplethLayer,
            dataView.categorical,
            choroplethOptions
        );

        this.handleLayer(
            circleOptions.layerControl,
            'circles-group',
            this.renderCircleLayer,
            dataView.categorical,
            circleOptions
        );

        //this.spinner.style.display = 'none'; // Hide spinner after rendering

        if (this.mapToolsOptions.lockMapExtent) {

            this.lockMapToCurrentExtent();

        } else {

            this.unlockMap();

            // Ensure the view is reset before fitting
            setTimeout(() => {
                this.map.getView().fit(this.mapExtent, this.fitMapOptions);
            }, 0);
        }


        // Optional: Clear entire SVG if all layers are off
        if (!choroplethOptions.layerControl && !circleOptions.layerControl) {
            this.svg.selectAll('*').remove();
        }

        // Force the map to update its size, for example when the visual window is resized
        this.map.updateSize();

    }

    // Helper function to handle layer visibility and rendering
    private handleLayer(shouldRender: boolean, groupId: string, renderFunction: (data: any, options: any) => void,
        data: any,
        options: any
    ) {
        const group = this.svg.select(`#${groupId}`);

        // Always clean up before re-rendering to avoid duplication
        group.selectAll("*").remove();  // Clear children, not the group itself

        if (shouldRender) {
            renderFunction.call(this, data, options);
        }

        // Call this in handleLayer when disabling a layer
        if (!shouldRender) {
            this.cleanupLayers();
        }
    }

    private updateBasemap(basemapOptions: BasemapOptions): void {

        // Dictionary of default attributions.
        const defaultAttributions: Record<string, string> = {
            mapbox: "© Mapbox © OpenStreetMap",
            openstreetmap: "© OpenStreetMap",
            none: ""
        };

        // Compute the effective attribution.
        const defaultAttribution = defaultAttributions[basemapOptions.selectedBasemap] || "";
        const newAttribution = basemapOptions.customMapAttribution
            ? `${basemapOptions.customMapAttribution} ${defaultAttribution}`
            : defaultAttribution;

        const mapboxStyleChanged = basemapOptions.mapboxStyle !== this.currentMapboxStyle;
        const basemapTypeChanged = basemapOptions.selectedBasemap !== this.currentBasemapType;
        const attributionChanged = newAttribution !== this.currentAttribution;

        if (!basemapTypeChanged && !mapboxStyleChanged && !attributionChanged) {
            return;
        }

        this.currentBasemapType = basemapOptions.selectedBasemap;
        this.currentMapboxStyle = basemapOptions.mapboxStyle;
        this.currentAttribution = newAttribution;

        let newLayer: any = null;

        if (basemapOptions.selectedBasemap === "mapbox") {

            // Create a Mapbox vector layer.
            this.mapboxVectorLayer = this.basemap.getMapboxBasemap(basemapOptions);
            newLayer = this.mapboxVectorLayer;

        } else if (basemapOptions.selectedBasemap === "openstreetmap") {

            // Create or retrieve the OpenStreetMap layer.
            this.basemapLayer = this.basemap.getBasemap(basemapOptions);
            newLayer = this.basemapLayer;

        } else if (basemapOptions.selectedBasemap === "none") {

            this.map.removeLayer(this.basemapLayer);
            this.map.removeLayer(this.mapboxVectorLayer);
        }

        // Remove the previous attribution control, if it exists.
        if (this.customAttributionControl) {
            this.map.removeControl(this.customAttributionControl);
        }

        // Create and add the new attribution control.
        this.customAttributionControl = new MaplyticsAttributionControl({ attribution: newAttribution });
        this.map.addControl(this.customAttributionControl);

        // Update the new layer’s attribution if a new layer was created.
        if (newLayer) {
            newLayer.getSource()?.setAttributions(newAttribution);
            this.map.getLayers().setAt(0, newLayer);
        }
    }


    private renderCircleLayer(categorical: any, circleOptions: CircleOptions) {

        if (!circleOptions.layerControl) return; // Early exit if layer is off

        this.legendContainer.style.display = "block";

        let longitudes: number[] | undefined;
        let latitudes: number[] | undefined;
        let circle1SizeValues: number[] | undefined;
        let circle2SizeValues: number[] | undefined;
        let minCircleSizeValue: number | undefined;
        let maxCircleSizeValue: number | undefined;
        let circleScale: number | undefined;

        if (circleOptions.layerControl) {

            this.svgOverlay.style.display = 'block';

            const lonCategory = categorical?.categories?.find((c) => c.source?.roles && c.source.roles["Longitude"]);
            const latCategory = categorical?.categories?.find((c) => c.source?.roles && c.source.roles["Latitude"]);
            //const circleSizeValuesMeasure = categorical?.values?.find((c) => c.source?.roles && c.source.roles["Size"]);

            const circleSizeValuesObjects = categorical?.values
                ?.filter((c) => c.source?.roles?.Size) || [];

            const combinedCircleSizeValues = [
                ...(circleSizeValuesObjects[0]?.values || []),
                ...(circleSizeValuesObjects[1]?.values || [])
            ].map(Number); // Ensure all elements are numbers


            if (!lonCategory || !latCategory) {
                console.warn("Both Longitude and Latitude roles must be assigned.");
                return;
            }

            longitudes = lonCategory.values as number[];
            latitudes = latCategory.values as number[];

            // Extract tooltips
            const tooltips = this.extractTooltips(categorical);

            // Create data points for each circle
            const dataPoints = longitudes.map((lon, i) => {

                // Ensure all relevant data roles (category, measure, etc.) are included
                const selectionId = this.host.createSelectionIdBuilder()
                    .withCategory(lonCategory, i) // Use the actual category variable
                    .withMeasure(circleSizeValuesObjects[0]?.source?.queryName) // Include measure roles if needed
                    .withMeasure(circleSizeValuesObjects[1]?.source?.queryName)
                    .createSelectionId();

                return {
                    longitude: lon,
                    latitude: latitudes[i],
                    //size1Value: circle1SizeValues?.[i] || circleOptions.minRadius,
                    tooltip: tooltips[i],
                    selectionId: selectionId, // Include selection ID
                };
            });


            if (longitudes.length !== latitudes.length) {

                console.warn("Longitude and Latitude have different lengths.");

            } else {

                // Handle Circle Size Measure or default size
                //const CircleSizeMeasure = categorical?.values?.find((c) => c.source?.roles && c.source.roles["Size"]);

                circle1SizeValues = circleSizeValuesObjects[0]?.values as number[];
                circle2SizeValues = circleSizeValuesObjects[1]?.values as number[];

                minCircleSizeValue = Math.min(...combinedCircleSizeValues);
                maxCircleSizeValue = Math.max(...combinedCircleSizeValues);
                circleScale = (circleOptions.maxRadius - circleOptions.minRadius) / (maxCircleSizeValue - minCircleSizeValue);

                const circleLayerOptions: CircleLayerOptions = {

                    // Required properties for the CircleLayer
                    longitudes: longitudes,
                    latitudes: latitudes,

                    // Circle customization options
                    circleOptions: circleOptions,
                    combinedCircleSizeValues: combinedCircleSizeValues,

                    // Optional properties for proportional circles
                    circle1SizeValues: circle1SizeValues,
                    circle2SizeValues: circle2SizeValues,
                    minCircleSizeValue: minCircleSizeValue,
                    circleScale: circleScale,
                    svg: this.svg,
                    svgContainer: this.svgContainer,
                    zIndex: 5,

                    dataPoints: dataPoints,
                    tooltipServiceWrapper: this.tooltipServiceWrapper, // Pass the wrapper
                    selectionManager: this.selectionManager,

                };

                // Remove existing CircleLayer if it exists
                if (this.circleLayer) {
                    this.map.removeLayer(this.circleLayer);
                }

                // Create new CircleLayer
                this.circleLayer = new CircleLayer(circleLayerOptions);

                this.map.addLayer(this.circleLayer);

                if (!this.choroplethDisplayed) {

                    this.mapExtent = this.circleLayer.getFeaturesExtent();

                    this.map.getView().fit(this.mapExtent, this.fitMapOptions);
                }

                // Render legend if proportional circles are used
                if (circleOptions.showLegend) {

                    this.legendContainer.style.display = "block";

                    let radii: number[] | undefined;

                    if (combinedCircleSizeValues.length > 0 && minCircleSizeValue !== undefined && circleScale !== undefined) {

                        radii = combinedCircleSizeValues.map((value) => circleOptions.minRadius + (value - minCircleSizeValue) * circleScale);

                        this.legendManager.createProportionalCircleLegend(
                            combinedCircleSizeValues,
                            radii,
                            circleOptions
                        );

                        this.legendManager.showLegend('circle');

                    }

                }


            }


        }
    }

    private renderChoroplethLayer(categorical: any, choroplethOptions: ChoroplethOptions) {

        if (!choroplethOptions.layerControl) return; // Early exit

        this.svgOverlay.style.display = 'flex';

        this.legendContainer.style.display = "block";

        console.log('Rendering choropleth...');

        // Validate input data
        if (!categorical.values || categorical.values.length === 0) {
            console.warn("Measures not found.");
            return;
        }

        const AdminPCodeNameIDCategory = categorical.categories.find(
            (c) => c.source?.roles && c.source.roles["AdminPCodeNameID"]
        );

        if (!AdminPCodeNameIDCategory) {
            console.warn("Admin PCode/Name/ID not found.");
            return;
        }

        const colorMeasure = categorical.values.find(
            (c) => c.source?.roles && c.source.roles["Color"]
        );

        //console.log('colorMeasure', colorMeasure);

        if (!colorMeasure) {
            console.warn("Color Measure not found.");
            return;
        }

        const serviceUrl: string = choroplethOptions.topoJSON_geoJSON_FileUrl;
        const cacheKey = `${choroplethOptions.locationPcodeNameId}`;

        // Cancel previous fetch
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        try {

            util.fetchAndCacheJsonGeoDataAsync(serviceUrl, this.memoryCache, cacheKey,
                this.abortController.signal as AbortSignal,
                constants.CACHE_EXPIRY_MS)
                .then((data: any) => {

                    // Check if layer is still enabled after async operation
                    if (!choroplethOptions.layerControl) return;

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

                    const simplifiedGeo: FeatureCollection = turf.simplify(geojson, turfOptions);

                    this.renderChoropleth(simplifiedGeo, AdminPCodeNameIDCategory, colorMeasure, choroplethOptions);
                });

        } catch (error) {
            console.error("Error fetching data:", error);
        }


    }

    private renderChoropleth(geodata: any, category: any, measure: any, choroplethOptions: ChoroplethOptions) {

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
        const classBreaks = this.getClassBreaks(colorValues, choroplethOptions);
        //console.log('classBreaks', classBreaks);

        const colorScale = this.getColorScale(classBreaks, choroplethOptions);
        //console.log('colorScale', colorScale);

        const pcodeKey = choroplethOptions.locationPcodeNameId;

        // Filter GeoJSON features based on valid PCodes
        const filteredGeoData = {
            ...geodata,
            features: geodata.features.filter((feature: any) =>
                validPCodes.includes(feature.properties[pcodeKey])
            )
        };

        const choroplethLayerOptions: ChoroplethLayerOptions = {

            geojson: filteredGeoData,
            strokeColor: choroplethOptions.strokeColor,
            strokeWidth: choroplethOptions.strokeWidth,
            fillOpacity: choroplethOptions.layerOpacity,
            colorScale: (value: any) => this.getColorFromClassBreaks(value, classBreaks, colorScale),
            dataKey: pcodeKey,
            svg: this.svg,
            svgContainer: this.svgContainer,
            zIndex: 5,
            categoryValues: category.values,
            measureValues: measure.values,
        }

        this.choroplethLayer = new ChoroplethLayer(choroplethLayerOptions);

        this.map.addLayer(this.choroplethLayer);

        this.mapExtent = this.choroplethLayer.getFeaturesExtent();

        this.map.getView().fit(this.mapExtent, this.fitMapOptions);

        //const svg = this.choroplethLayer.getSvg(); // Get the SVG element

        // Update the legend
        if (choroplethOptions.showLegend) {

            this.legendContainer.style.display = "block";

            this.legendManager.createChoroplethLegend(
                colorValues,
                classBreaks,
                colorScale,
                choroplethOptions
            );

            this.legendManager.showLegend('choropleth');

        }
        else {

            this.legendManager.hideLegend('choropleth');
        }

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
            MaplyticsVisualFormattingSettingsModel,
            options.dataViews[0]
        );
    }

    private getBasemapOptions(): BasemapOptions {
        const basemapSettings = this.visualFormattingSettingsModel.BasemapVisualCardSettings;
        return {
            selectedBasemap: basemapSettings.basemapSelectSettingsGroup.selectedBasemap.value.value.toString(),
            customMapAttribution: basemapSettings.basemapSelectSettingsGroup.customMapAttribution.value.toString(),
            mapboxCustomStyleUrl: basemapSettings.mapBoxSettingsGroup.mapboxCustomStyleUrl.value.toString(),
            mapboxStyle: basemapSettings.mapBoxSettingsGroup.mapboxStyle.value.value.toString(),
            mapboxAccessToken: basemapSettings.mapBoxSettingsGroup.mapboxAccessToken.value.toString(),
            mapboxBaseUrl: basemapSettings.mapBoxSettingsGroup.mapboxBaseUrl.value.toString(),
            declutterLabels: basemapSettings.mapBoxSettingsGroup.declutterLabels.value,
        };
    }

    private getMapToolsOptions(): MapToolsOptions {
        const maptoolsSettings = this.visualFormattingSettingsModel.MapToolsVisualCardSettings;
        return {

            lockMapExtent: maptoolsSettings.mapToolsSettingsGroup.lockMapExtent.value,
            showZoomControl: maptoolsSettings.mapToolsSettingsGroup.showZoomControl.value,
            legendPosition: maptoolsSettings.legendContainerSettingsGroup.legendPosition.value.value.toString(),
            legendBorderWidth: maptoolsSettings.legendContainerSettingsGroup.legendBorderWidth.value,
            legendBorderColor: maptoolsSettings.legendContainerSettingsGroup.legendBorderColor.value.value,
            legendBackgroundColor: maptoolsSettings.legendContainerSettingsGroup.legendBackgroundColor.value.value,
            legendBackgroundOpacity: maptoolsSettings.legendContainerSettingsGroup.legendBackgroundOpacity.value / 100,
            legendBorderRadius: maptoolsSettings.legendContainerSettingsGroup.legendBorderRadius.value,
            legendBottomMargin: maptoolsSettings.legendContainerSettingsGroup.legendBottomMargin.value,
        };
    }

    private getCircleOptions(): CircleOptions {
        const circleSettings =
            this.visualFormattingSettingsModel.ProportionalCirclesVisualCardSettings;
        return {
            layerControl: circleSettings.topLevelSlice.value,
            color: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCirclesColor.value.value,
            minRadius: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCirclesMinimumRadius.value,
            maxRadius: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCirclesMaximumRadius.value,
            strokeColor: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCirclesStrokeColor.value.value,
            strokeWidth: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCirclesStrokeWidth.value,
            layerOpacity: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCirclesLayerOpacity.value / 100,
            showLegend: circleSettings.proportionalCircleLegendSettingsGroup.showLegend.value,
            legendTitle: circleSettings.proportionalCircleLegendSettingsGroup.legendTitle.value,
            legendTitleColor: circleSettings.proportionalCircleLegendSettingsGroup.legendTitleColor.value.value,
            leaderLineStrokeWidth: circleSettings.proportionalCircleLegendSettingsGroup.leaderLineStrokeWidth.value,
            leaderLineColor: circleSettings.proportionalCircleLegendSettingsGroup.leaderLineColor.value.value,
            labelTextColor: circleSettings.proportionalCircleLegendSettingsGroup.labelTextColor.value.value

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
            legendTitleAlignment: choroplethLegendSettings.legendTitleAlignment.value.value.toString(),
            legendOrientation: choroplethLegendSettings.legendOrientation.value.value.toString(),
            legendLabelPosition: choroplethLegendSettings.legendLabelPosition.value.value.toString(),
            legendTitleColor: choroplethLegendSettings.legendTitleColor.value.value,
            legendLabelsColor: choroplethLegendSettings.legendLabelsColor.value.value
        };
    }

    private extractTooltips(categorical: any): VisualTooltipDataItem[][] {
        // Assuming tooltip fields are in the 'values' collection
        const tooltipFields = categorical.values.filter(v => v.source.roles["Tooltips"]);
        const tooltips: VisualTooltipDataItem[][] = [];

        for (let i = 0; i < categorical.categories[0].values.length; i++) {
            const tooltipItems: VisualTooltipDataItem[] = tooltipFields.map(field => ({
                displayName: field.source.displayName,
                value: field.values[i]
            }));
            tooltips.push(tooltipItems);
        }

        return tooltips;
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(
            this.visualFormattingSettingsModel
        );
    }

    private lockMapToCurrentExtent() {
        const currentView = this.map.getView();
        const currentExtent = currentView.calculateExtent(this.map.getSize());
        const currentResolution = currentView.getResolution();

        if (!currentResolution) {
            console.error("Unable to calculate current resolution.");
            return;
        }

        // Backup original controls
        this.originalControls = this.map.getControls().getArray();

        // Remove all controls (including zoom buttons)
        this.originalControls.forEach(control => {
            this.map.removeControl(control);
        });

        // Backup and clear interactions
        this.originalInteractions = this.map.getInteractions().getArray();
        this.map.getInteractions().clear();

        // Add back non-zoom interactions (e.g., drag pan)
        this.originalInteractions.forEach(interaction => {
            if (!this.isZoomInteraction(interaction)) {
                this.map.addInteraction(interaction);
            }
        });

        // Create and set the locked view
        this.lockedView = new View({
            projection: currentView.getProjection(),
            center: currentView.getCenter(),
            extent: currentExtent,
            resolution: currentResolution,
            minResolution: currentResolution,
            maxResolution: currentResolution,
            constrainOnlyCenter: true,
            enableRotation: false
        });

        this.map.setView(this.lockedView);
    }



    private isZoomInteraction(interaction: Interaction): boolean {
        return interaction instanceof DragZoom ||
            interaction instanceof MouseWheelZoom ||
            interaction instanceof PinchZoom ||
            interaction instanceof DoubleClickZoom;
    }

    private unlockMap() {
        if (!this.map || !this.lockedView) return;

        // Restore controls
        this.originalControls.forEach(control => this.map.addControl(control));

        // Restore interactions
        this.map.getInteractions().clear();
        this.originalInteractions.forEach(interaction =>
            this.map.addInteraction(interaction)
        );

        // Create completely unrestricted view
        const freeView = new View({
            projection: this.lockedView.getProjection(),
            center: this.lockedView.getCenter(),
            zoom: this.lockedView.getZoom(),
            extent: undefined,
            minResolution: undefined,
            maxResolution: undefined,
            constrainResolution: false
        });

        this.map.setView(freeView);
        this.lockedView = null;

        // Force view refresh
        this.map.updateSize();
        this.map.render();
    }

    private cleanupLayers() {
        if (this.circleLayer) {
            this.legendManager.clearContainer(this.legendManager.getCircleLegendContainer());
            // this.legendContainer.style.display = "none"; // Hide the legend
            this.map.removeLayer(this.circleLayer);
            this.circleLayer.setActive(false); // Ensure no further renders
            this.circleLayer = null;
        }
        if (this.choroplethLayer) {
            this.legendManager.clearContainer(this.legendManager.getChoroplethLegendContainer());
            // this.legendContainer.style.display = "none"; // Hide the legend
            this.map.removeLayer(this.choroplethLayer);
            this.choroplethLayer.setActive(false); // Ensure no further renders
            this.choroplethLayer = null;
        }
    }

    public destroy(): void {

        this.map.setTarget(null);
        this.svg.selectAll('*').remove();

    }

}



