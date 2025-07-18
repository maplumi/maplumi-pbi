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

import { createTooltipServiceWrapper, ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";
import ISelectionManager = powerbi.extensibility.ISelectionManager;

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IVisualEventService = powerbi.extensibility.IVisualEventService;

import { MaplumiVisualFormattingSettingsModel } from "./settings"; import "ol/ol.css";
import Map from "ol/Map";
import { fromLonLat } from "ol/proj";
import { BasemapOptions, ChoroplethData, ChoroplethDataSet, ChoroplethLayerOptions, ChoroplethOptions, CircleData, CircleLayerOptions, CircleOptions, MapToolsOptions } from "./types/index";
import { CircleLayer } from "./layers/circleLayer";
import { ChoroplethLayer } from "./layers/choroplethLayer";
import * as d3 from "d3";
import * as requestHelpers from "./utils/requestHelpers";
import { LegendService } from "./services/legendService";
import { MapService } from "./services/mapService";
import { ChoroplethDataService } from "./services/ChoroplethDataService";
import { ColorRampManager } from "./services/ColorRampManager";
import { Extent } from "ol/extent";
import { VisualConfig } from "./config/VisualConfig";
import { CacheService } from "./services/cacheService";
import { View } from "ol";
export class MaplumiVisual implements IVisual {

    private host: IVisualHost;
    private formattingSettingsService: FormattingSettingsService;
    private visualFormattingSettingsModel: MaplumiVisualFormattingSettingsModel;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private selectionManager: ISelectionManager;
    private container: HTMLElement;
    private svgContainer: HTMLElement;
    private legendContainer: HTMLElement;
    private colorRampManager: ColorRampManager;
    private legendService: LegendService;
    private mapService: MapService;
    private dataService: ChoroplethDataService;
    private svgOverlay: SVGSVGElement;
    private svg: d3.Selection<SVGElement, unknown, HTMLElement, any>;
    private map: Map;
    private view: View;
    private mapToolsOptions: MapToolsOptions;
    private circleLayer: CircleLayer;
    private choroplethLayer: ChoroplethLayer;
    private mapExtent: Extent | undefined;
    private choroplethDisplayed: boolean = false;
    private cacheService: CacheService;
    private abortController: AbortController | null = null;
    private events: IVisualEventService;
    private circleGroup1: string = "#circles-group-1";
    private circleGroup2: string = "#circles-group-2";
    private choroplethGroup: string = "#choropleth-group";
    private previousLockMapExtent: boolean | undefined;

    constructor(options: VisualConstructorOptions) {

        this.host = options.host;
        this.events = options.host.eventService;

        this.formattingSettingsService = new FormattingSettingsService();
        this.visualFormattingSettingsModel = new MaplumiVisualFormattingSettingsModel();

        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService);
        this.selectionManager = this.host.createSelectionManager();

        this.container = options.element;

        //legend container
        this.legendContainer = document.createElement("div");
        this.legendContainer.setAttribute("id", "legendContainer");
        this.legendContainer.style.position = "absolute";
        this.legendContainer.style.zIndex = "1000";
        this.legendContainer.style.display = "none"; // Hidden by default

        this.legendContainer.style.pointerEvents = 'none';

        this.container.appendChild(this.legendContainer);

        this.legendService = new LegendService(this.legendContainer);

        this.mapService = new MapService(this.container, this.mapToolsOptions?.showZoomControl !== false, this.host);
        this.map = this.mapService.getMap();
        this.view = this.mapService.getView();

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

        // Subscribe to selection changes
        this.selectionManager.registerOnSelectCallback(() => {

            const selectionIds = this.selectionManager.getSelectionIds();

            // Update both layers if they exist
            if (this.circleLayer) {
                this.circleLayer.setSelectedIds(selectionIds);
                this.circleLayer.changed();
            }
            if (this.choroplethLayer) {
                this.choroplethLayer.setSelectedIds(selectionIds);
                this.choroplethLayer.changed();
            }
        });

        this.cacheService = new CacheService();
    }

    public update(options: VisualUpdateOptions) {
        this.events.renderingStarted(options);
        const dataView = options.dataViews[0];

        this.map.setView(this.view); // default view

        // Update formatting settings
        this.visualFormattingSettingsModel = this.formattingSettingsService
            .populateFormattingSettingsModel(MaplumiVisualFormattingSettingsModel, options.dataViews[0]);

        // Get latest options early for lockMapExtent
        this.mapToolsOptions = this.getMapToolsOptions();

        // Apply conditional display logic
        this.visualFormattingSettingsModel.BasemapVisualCardSettings.applyConditionalDisplayRules();
        this.visualFormattingSettingsModel.ChoroplethVisualCardSettings.choroplethDisplaySettingsGroup.applyConditionalDisplayRules();
        this.visualFormattingSettingsModel.ChoroplethVisualCardSettings.choroplethLocationBoundarySettingsGroup.applyConditionalDisplayRules();
        this.visualFormattingSettingsModel.mapControlsVisualCardSettings.mapToolsSettingsGroup.applyConditionalDisplayRules();
        this.visualFormattingSettingsModel.mapControlsVisualCardSettings.legendContainerSettingsGroup.applyConditionalDisplayRules();

        // Clean up previous layers and SVG elements
        this.svg.selectAll('*').remove();
        this.svgOverlay.style.display = 'none';

        // Get latest options
        const basemapOptions = this.getBasemapOptions();
        const circleOptions = this.getCircleOptions();
        const choroplethOptions = this.getChoroplethOptions();
        this.mapToolsOptions = this.getMapToolsOptions();


        // Dynamically toggle zoom control
        this.mapService.setZoomControlVisible(this.mapToolsOptions.showZoomControl);

        // Update legend container styles
        this.updateLegendContainer();

        // Create color ramp service and data service
        const colorRampName = choroplethOptions.colorRamp;
        const colorRamp: string[] = VisualConfig.COLORRAMPS[colorRampName.toUpperCase()];
        const customColorRamp: string[] = choroplethOptions.customColorRamp.split(",");

        // Validate custom color ramp: trim and check for valid hex colors
        const validCustomColorRamp = customColorRamp
            .map(c => c.trim())
            .filter(c => /^#([0-9A-Fa-f]{3}){1,2}$/.test(c));

        let selectedColorRamp: string[];
        if (colorRampName === "custom") {
            if (validCustomColorRamp.length > 0) {
                selectedColorRamp = validCustomColorRamp;
            } else {
                selectedColorRamp = colorRamp;

                this.host.displayWarningIcon(
                    "Invalid or empty custom color ramp.",
                    "maplumiWarning: Invalid or empty custom color ramp. Using default color ramp instead. Please provide a valid comma-separated list of hex color codes."
                );

            }
        } else {
            selectedColorRamp = colorRamp;
        }

        // Initialize color ramp and data service
        this.colorRampManager = new ColorRampManager(selectedColorRamp);
        this.dataService = new ChoroplethDataService(this.colorRampManager, this.host);

        // If no data, clear everything and return
        if (!dataView || !dataView.categorical) {
            this.svg.selectAll('*').remove();
            this.legendContainer.style.display = "none";
            this.events.renderingFinished(options);
            return;
        }

        this.choroplethDisplayed = choroplethOptions.layerControl;
        this.mapService.updateBasemap(basemapOptions);

        // Render layers based on settings
        if (choroplethOptions.layerControl == true) {

            this.renderChoroplethLayer(dataView.categorical, choroplethOptions);

        } else {

            const group = this.svg.select(`#choropleth-group`);

            group.selectAll("*").remove();  // Clear children

            if (this.choroplethLayer) {
                this.map.removeLayer(this.choroplethLayer);
                this.choroplethLayer = undefined; // Reset choropleth layer
            }

            this.legendService.hideLegend("choropleth");
        }

        if (circleOptions.layerControl == true) {

            this.renderCircleLayer(dataView.categorical, circleOptions);

        } else {

            const group1 = this.svg.select(`#circles-group-1`);
            const group2 = this.svg.select(`#circles-group-2`);

            // Always clean up children
            group1.selectAll("*").remove();
            group2.selectAll("*").remove();

            if (this.circleLayer) {
                this.map.removeLayer(this.circleLayer);
                this.circleLayer = undefined; // Reset circle layer
            }

            this.legendService.hideLegend("circle");
        }

        // Update legend visibility
        if (choroplethOptions.layerControl == false && circleOptions.layerControl == false) {
            this.legendContainer.style.display = "none";
        }

        this.map.updateSize();

        // Handle map extent locking
        if (this.mapToolsOptions.lockMapExtent == true) {

            this.map.on('postrender', () => {
                const currentExtent = this.map.getView().calculateExtent(this.map.getSize());
                const currentExtentString = currentExtent.join(",");
                const currentZoom = this.map.getView().getZoom();
                if (currentExtentString !== this.mapToolsOptions.lockedMapExtent ||
                    currentZoom !== this.mapToolsOptions.lockedMapZoom
                ) {
                    this.persistCurrentExtentAsLocked(currentExtentString, currentZoom);
                }
            });

            let lockedExtent: [number, number, number, number] | undefined = undefined;
            if (typeof this.mapToolsOptions.lockedMapExtent === 'string' && this.mapToolsOptions.lockedMapExtent.trim() !== '') {
                lockedExtent = this.mapToolsOptions.lockedMapExtent.split(",").map(Number) as [number, number, number, number];
            }
            if (this.mapToolsOptions.lockMapExtent === true && lockedExtent && lockedExtent.length === 4) {
                const center: [number, number] = [
                    (lockedExtent[0] + lockedExtent[2]) / 2,
                    (lockedExtent[1] + lockedExtent[3]) / 2
                ];
                let zoom = this.map.getView().getZoom();
                if (typeof this.mapToolsOptions.lockedMapZoom === 'number' && !isNaN(this.mapToolsOptions.lockedMapZoom)) {
                    zoom = this.mapToolsOptions.lockedMapZoom;
                }
                this.mapService.lockExtent(lockedExtent, center, zoom);
                this.map.getView().fit(lockedExtent, VisualConfig.MAP.FIT_OPTIONS);
                this.mapService.setZoomControlVisible(false);
            }

        } else {
            this.map.getView().setProperties({ extent: undefined, minZoom: 0, maxZoom: 28 });
        }

        this.previousLockMapExtent = this.mapToolsOptions.lockMapExtent;
        this.events.renderingFinished(options);
    }


    // **** CIRCLE LAYER ****
    // This function is responsible for rendering the circle layer on the map

    private renderCircleLayer(categorical: any, circleOptions: CircleOptions): void {

        // Check if circle layer is enabled
        if (circleOptions.layerControl == false) return; // Early exit if layer is off

        const group1 = this.svg.select(`#circles-group-1`);
        const group2 = this.svg.select(`#circles-group-2`);

        // Always clean up children before re-rendering to avoid duplication
        group1.selectAll("*").remove();
        group2.selectAll("*").remove();

        this.legendContainer.style.display = "block";
        this.svgOverlay.style.display = "block";

        const { longitudes, latitudes, circleSizeValuesObjects } = this.extractCircleData(categorical);
        if (!longitudes || !latitudes) return;

        const combinedCircleSizeValues = this.combineCircleSizeValues(circleSizeValuesObjects);
        const { minCircleSizeValue, maxCircleSizeValue, circleScale } = this.calculateCircleScale(
            combinedCircleSizeValues,
            circleOptions
        );

        const dataPoints = this.createCircleDataPoints(longitudes, latitudes, circleSizeValuesObjects, categorical);

        if (longitudes.length !== latitudes.length) {
            this.host.displayWarningIcon("Longitude and Latitude have different lengths.", "maplumiWarning: Longitude and Latitude have different lengths. Please ensure that both fields are populated with the same number of values.");

            return;
        }

        const circleLayerOptions: CircleLayerOptions = this.createCircleLayerOptions(
            longitudes,
            latitudes,
            circleOptions,
            combinedCircleSizeValues,
            minCircleSizeValue,
            circleScale,
            dataPoints,
            circleSizeValuesObjects[0]?.values as number[],
            circleSizeValuesObjects[1]?.values as number[]
        );

        this.renderCircleLayerOnMap(circleLayerOptions);


        if (circleOptions.showLegend) {
            this.renderCircleLegend(combinedCircleSizeValues, circleSizeValuesObjects.length, minCircleSizeValue, circleScale, circleOptions);
        } else {
            this.legendService.hideLegend("circle");
        }
    }

    private extractCircleData(categorical: any): CircleData {

        const lonCategory = categorical?.categories?.find((c) => c.source?.roles?.Longitude);
        const latCategory = categorical?.categories?.find((c) => c.source?.roles?.Latitude);

        if (!lonCategory || !latCategory) {
            this.host.displayWarningIcon("Missing Longitude or Latitude roles", "maplumiWarning: Both Longitude and Latitude roles must be assigned to view scaled cirles. Please check your data fields.");
            return { longitudes: undefined, latitudes: undefined, circleSizeValuesObjects: [] };
        }

        const circleSizeValuesObjects = categorical?.values?.filter((c) => c.source?.roles?.Size) || [];
        return {
            longitudes: lonCategory.values as number[],
            latitudes: latCategory.values as number[],
            circleSizeValuesObjects,
        };
    }

    private combineCircleSizeValues(circleSizeValuesObjects: any[]): number[] {
        return [
            ...(circleSizeValuesObjects[0]?.values || []),
            ...(circleSizeValuesObjects[1]?.values || []),
        ].map(Number); // Ensure all elements are numbers
    }

    private calculateCircleScale(
        combinedCircleSizeValues: number[],
        circleOptions: CircleOptions
    ): { minCircleSizeValue: number; maxCircleSizeValue: number; circleScale: number } {

        const minCircleSizeValue = Math.min(...combinedCircleSizeValues);
        const maxCircleSizeValue = Math.max(...combinedCircleSizeValues);

        let circleScale: number;
        if (maxCircleSizeValue === minCircleSizeValue) {
            circleScale = 1; // No scaling needed, use the minimum radius
        } else {
            circleScale = (circleOptions.maxRadius - circleOptions.minRadius) / (maxCircleSizeValue - minCircleSizeValue);
        }

        return { minCircleSizeValue, maxCircleSizeValue, circleScale };
    }

    private createCircleDataPoints(
        longitudes: number[],
        latitudes: number[],
        circleSizeValuesObjects: any[],
        categorical: any
    ): any[] {
        const tooltips = this.dataService.extractTooltips(categorical);

        return longitudes.map((lon, i) => {
            const selectionId = this.host
                .createSelectionIdBuilder()
                .withCategory(categorical.categories[0], i)
                .withMeasure(circleSizeValuesObjects[0]?.source?.queryName)
                .withMeasure(circleSizeValuesObjects[1]?.source?.queryName)
                .createSelectionId();

            return {
                longitude: lon,
                latitude: latitudes[i],
                tooltip: tooltips[i],
                selectionId,
            };
        });
    }

    private createCircleLayerOptions(
        longitudes: number[],
        latitudes: number[],
        circleOptions: CircleOptions,
        combinedCircleSizeValues: number[],
        minCircleSizeValue: number,
        circleScale: number,
        dataPoints: any[],
        circle1SizeValues?: number[],
        circle2SizeValues?: number[]
    ): CircleLayerOptions {

        return {
            longitudes,
            latitudes,

            circleOptions,
            combinedCircleSizeValues,

            circle1SizeValues,
            circle2SizeValues,

            minCircleSizeValue,
            circleScale,
            svg: this.svg,
            svgContainer: this.svgContainer,
            zIndex: 5,

            dataPoints,
            tooltipServiceWrapper: this.tooltipServiceWrapper,
            selectionManager: this.selectionManager,
        };
    }

    private renderCircleLayerOnMap(circleLayerOptions: CircleLayerOptions): void {
        // Remove existing CircleLayer if it exists
        if (this.circleLayer) {
            this.map.removeLayer(this.circleLayer);
        }

        // Create and add the new CircleLayer
        this.circleLayer = new CircleLayer(circleLayerOptions);
        this.map.addLayer(this.circleLayer);

        // Always fit to features unless extent is locked
        if (this.choroplethDisplayed === false && this.mapToolsOptions.lockMapExtent === false) {
            this.mapExtent = this.circleLayer.getFeaturesExtent();
            if (this.mapExtent) {
                this.map.getView().fit(this.mapExtent, VisualConfig.MAP.FIT_OPTIONS);
            }
        }
    }

    private renderCircleLegend(
        combinedCircleSizeValues: number[],
        numberofCircleCategories: number,
        minCircleSizeValue: number,
        circleScale: number,
        circleOptions: CircleOptions
    ): void {
        const radii = combinedCircleSizeValues.map(
            (value) => circleOptions.minRadius + (value - minCircleSizeValue) * circleScale
        );

        this.legendService.createProportionalCircleLegend(
            combinedCircleSizeValues,
            radii,
            numberofCircleCategories,
            circleOptions
        );

        this.legendService.showLegend("circle");
    }

    // *** END CIRCLE LAYER ***

    // **** CHOROPLETH LAYER ****
    // This function is responsible for rendering the choropleth layer on the map
    private renderChoroplethLayer(categorical: any, choroplethOptions: ChoroplethOptions): void {

        if (choroplethOptions.layerControl == false) return; // Early exit if the layer is disabled

        const group = this.svg.select(`#choropleth-group`);

        // Always clean up before re-rendering to avoid duplication
        group.selectAll("*").remove();  // Clear children, not the group itself

        this.svgOverlay.style.display = 'flex';
        this.legendContainer.style.display = "block";

        if (!this.validateChoroplethInputData(categorical)) return;

        const { AdminPCodeNameIDCategory, colorMeasure, pCodes } = this.extractChoroplethData(categorical);
        if (!AdminPCodeNameIDCategory || !colorMeasure || !pCodes) return;

        const validPCodes = this.filterValidPCodes(pCodes);
        if (validPCodes.length === 0) return;

        const { colorValues, classBreaks, colorScale, pcodeKey, dataPoints } =
            this.prepareChoroplethData(categorical, choroplethOptions, AdminPCodeNameIDCategory, colorMeasure, pCodes);

        this.fetchAndRenderChoroplethLayer(
            choroplethOptions,
            AdminPCodeNameIDCategory,
            colorMeasure,
            colorValues,
            classBreaks,
            colorScale,
            pcodeKey,
            dataPoints
        );
    }


    private validateChoroplethInputData(categorical: any): boolean {
        if (!categorical.values || categorical.values.length === 0) {
            this.host.displayWarningIcon("Measures not found", "maplumiWarning: Measures field is missing. Please ensure it is included in your data.");
            return false;
        }
        return true;
    }

    private extractChoroplethData(categorical: any): ChoroplethData {

        const AdminPCodeNameIDCategory = categorical.categories.find(
            (c) => c.source?.roles && c.source.roles["AdminPCodeNameID"]
        );

        if (!AdminPCodeNameIDCategory) {
            this.host.displayWarningIcon("Admin PCode/Name/ID not found", "maplumiWarning: Admin PCode/Name/ID field is missing. Please ensure it is included in your data.");
            return { AdminPCodeNameIDCategory: undefined, colorMeasure: undefined, pCodes: undefined };
        }

        const colorMeasure = categorical.values.find(
            (c) => c.source?.roles && c.source.roles["Color"]
        );

        if (!colorMeasure) {
            this.host.displayWarningIcon("Color Measure not found", "maplumiWarning: Color measure field is missing. Please ensure it is included in your data.");

            return { AdminPCodeNameIDCategory, colorMeasure: undefined, pCodes: undefined };
        }

        const pCodes = AdminPCodeNameIDCategory.values as string[];
        if (!pCodes || pCodes.length === 0) {
            this.host.displayWarningIcon("No PCodes found", "maplumiWarning: No PCodes found in the Admin PCode/Name/ID field. Please ensure it is populated.");

            return { AdminPCodeNameIDCategory, colorMeasure, pCodes: undefined };
        }

        return { AdminPCodeNameIDCategory, colorMeasure, pCodes };
    }

    private filterValidPCodes(pCodes: string[]): string[] {
        const validPCodes = pCodes.filter((pcode) => pcode);
        if (validPCodes.length === 0) {
            this.host.displayWarningIcon("No valid PCodes found", "maplumiWarning: No valid PCodes found in the Admin PCode/Name/ID field. Please ensure it is populated.");

        }
        return validPCodes;
    }

    private prepareChoroplethData(
        categorical: any,
        choroplethOptions: ChoroplethOptions,
        AdminPCodeNameIDCategory: any,
        colorMeasure: any,
        pCodes: string[]
    ): ChoroplethDataSet {

        const colorValues: number[] = colorMeasure.values;
        const classBreaks = this.dataService.getClassBreaks(colorValues, choroplethOptions);
        const colorScale = this.dataService.getColorScale(classBreaks, choroplethOptions);
        const pcodeKey = choroplethOptions.locationPcodeNameId;

        const tooltips = this.dataService.extractTooltips(categorical);

        const dataPoints = pCodes.map((pcode, i) => {
            const selectionId = this.host.createSelectionIdBuilder()
                .withCategory(AdminPCodeNameIDCategory, i)
                .withMeasure(colorMeasure.source.queryName)
                .createSelectionId();

            return {
                pcode: pcode,
                value: colorValues[i],
                tooltip: tooltips[i],
                selectionId: selectionId
            };

        });

        // Debug: log color assignment for each value
        // colorValues.forEach((v, i) => {
        //     const idx = classBreaks.indexOf(v);
        //     const color = this.dataService.getColorFromClassBreaks(v, classBreaks, colorScale, choroplethOptions.classificationMethod);
        //     if (idx === -1) {
        //         console.log(`Value ${v} (index ${i}) is overflow, assigned fallback color: ${color}`);
        //     } else {
        //         console.log(`Value ${v} (index ${i}) matched classBreaks[${idx}], assigned color: ${color}`);
        //     }
        // });

        // console.log("Class Breaks:", classBreaks);
        // console.log("Color Scale:", colorScale);

        // Warn if too many unique values for unique value classification
        if (choroplethOptions.classificationMethod === "u" && classBreaks.length > 7) {
            this.host.displayWarningIcon(
                "Too many unique values for unique value classification.",
                "maplumiWarning: Only the top 7 unique values are mapped to colors; all others are shown in black. Please select a different classification method for better results."
            );
        }        

        return { colorValues, classBreaks, colorScale, pcodeKey, dataPoints };
    }

    private async fetchAndRenderChoroplethLayer(
        choroplethOptions: ChoroplethOptions,
        AdminPCodeNameIDCategory: any,
        colorMeasure: any,
        colorValues: number[],
        classBreaks: any,
        colorScale: any,
        pcodeKey: string,
        dataPoints: any[]
    ): Promise<void> {

        const serviceUrl: string = choroplethOptions.topoJSON_geoJSON_FileUrl;
        const cacheKey = `${choroplethOptions.locationPcodeNameId}`;

        // Cancel previous fetch
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        try {
            const data = await this.cacheService.getOrFetch(cacheKey, async () => {

                if (!requestHelpers.isValidURL(serviceUrl)) {
                    this.host.displayWarningIcon(
                        "Invalid Geo/TopoJSON URL",
                        "maplumiWarning: The provided GeoJSON URL is not valid. Please check the data source URL."
                    );
                    return null;
                }
                let response: Response;
                try {
                    response = await window.fetch(serviceUrl, { signal: this.abortController!.signal });
                } catch (e) {
                    this.host.displayWarningIcon(
                        "Geo/TopoJSON Fetch Error",
                        "maplumiWarning: Failed to fetch Geo/TopoJSON data. Please check your network connection or the data source URL."
                    );
                    return null;
                }
                if (!response.ok) {
                    this.host.displayWarningIcon(
                        "Geo/TopoJSON Fetch Error",
                        `maplumiWarning: Failed to fetch Geo/TopoJSON data. Server responded with status: ${response.status}`
                    );
                    return null;
                }
                const json = await response.json();
                if (!(await requestHelpers.isValidJsonResponse(json))) {
                    this.host.displayWarningIcon(
                        "Invalid Geo/TopoJSON Data",
                        "maplumiWarning: The fetched Geo/TopoJSON data is not valid. Please check the data source."
                    );
                    return null;
                }
                return json;
            });

            if (!data || !choroplethOptions.layerControl) return;

            const processedGeoData = this.dataService.processGeoData(
                data,
                choroplethOptions.locationPcodeNameId,
                AdminPCodeNameIDCategory.values
            );

            const choroplethLayerOptions: ChoroplethLayerOptions = {
                geojson: processedGeoData,
                strokeColor: choroplethOptions.strokeColor,
                strokeWidth: choroplethOptions.strokeWidth,
                fillOpacity: choroplethOptions.layerOpacity,
                colorScale: (value: any) =>
                    this.dataService.getColorFromClassBreaks(value, classBreaks, colorScale, choroplethOptions.classificationMethod),
                dataKey: pcodeKey,
                svg: this.svg,
                svgContainer: this.svgContainer,
                zIndex: 5,
                categoryValues: AdminPCodeNameIDCategory.values,
                measureValues: colorMeasure.values,
                selectionManager: this.selectionManager,
                tooltipServiceWrapper: this.tooltipServiceWrapper,
                dataPoints
            };

            this.renderChoroplethLayerOnMap(choroplethLayerOptions, choroplethOptions, colorValues, classBreaks, colorScale);

        } catch (error) {
            this.host.displayWarningIcon("Error fetching data", "maplumiWarning: An error occurred while fetching the choropleth data. Please check the URL and your network connection.");

        }
    }

    private renderChoroplethLayerOnMap(
        choroplethLayerOptions: ChoroplethLayerOptions,
        choroplethOptions: ChoroplethOptions,
        colorValues: number[],
        classBreaks: any,
        colorScale: any
    ): void {
        if (this.choroplethLayer) {
            this.map.removeLayer(this.choroplethLayer);
        }
        this.choroplethLayer = new ChoroplethLayer(choroplethLayerOptions);
        this.map.addLayer(this.choroplethLayer);

        // Always fit to features unless extent is locked
        if (this.mapToolsOptions.lockMapExtent === false) {
            this.mapExtent = this.choroplethLayer.getFeaturesExtent();
            if (this.mapExtent) {
                this.map.getView().fit(this.mapExtent, VisualConfig.MAP.FIT_OPTIONS);
            }
        }

        if (choroplethOptions.showLegend) {
            this.legendContainer.style.display = "block";
            this.legendService.createChoroplethLegend(colorValues, classBreaks, colorScale, choroplethOptions);
            this.legendService.showLegend('choropleth');
        } else {
            this.legendService.hideLegend('choropleth');
        }
    }

    // *** END CHOROPLETH LAYER ***

    private updateLegendContainer(): void {

        // Update legend container styles
        this.legendContainer.style.background = this.mapToolsOptions.legendBackgroundColor;
        this.legendContainer.style.opacity = this.mapToolsOptions.legendBackgroundOpacity.toString();
        this.legendContainer.style.border = `${this.mapToolsOptions.legendBorderWidth}px solid ${this.mapToolsOptions.legendBorderColor}`;
        this.legendContainer.style.borderRadius = `${this.mapToolsOptions.legendBorderRadius}px`;
        this.legendContainer.style.marginBottom = `${this.mapToolsOptions.legendBottomMargin}px`;
        this.legendContainer.style.marginTop = `${this.mapToolsOptions.legendTopMargin}px`;
        this.legendContainer.style.marginLeft = `${this.mapToolsOptions.legendLeftMargin}px`;
        this.legendContainer.style.marginRight = `${this.mapToolsOptions.legendRightMargin}px`;

        // Reset all positioning properties first
        this.legendContainer.style.top = 'auto';
        this.legendContainer.style.right = 'auto';
        this.legendContainer.style.bottom = 'auto';
        this.legendContainer.style.left = 'auto';
        this.legendContainer.style.transform = 'none'; // Reset any previous transforms

        // Set new position
        switch (this.mapToolsOptions.legendPosition) {
            case 'top-right':
                this.legendContainer.style.top = '10px';
                this.legendContainer.style.right = '10px';
                break;
            case 'top-left':
                this.legendContainer.style.top = '10px';
                this.legendContainer.style.left = '10px';
                break;
            case 'bottom-right':
                this.legendContainer.style.bottom = '10px';
                this.legendContainer.style.right = '10px';
                break;
            case 'top-center':
                this.legendContainer.style.top = '10px';
                this.legendContainer.style.left = '50%';
                this.legendContainer.style.transform = 'translateX(-50%)';
                break;
            case 'bottom-center':
                this.legendContainer.style.bottom = '10px';
                this.legendContainer.style.left = '50%';
                this.legendContainer.style.transform = 'translateX(-50%)';
                break;
            default: // bottom-left (default)
                this.legendContainer.style.bottom = '10px';
                this.legendContainer.style.left = '10px';
                break;
        }
    }

    private getBasemapOptions(): BasemapOptions {
        const basemapSettings = this.visualFormattingSettingsModel.BasemapVisualCardSettings;
        return {
            selectedBasemap: basemapSettings.basemapSelectSettingsGroup.selectedBasemap.value.value.toString(),
            customMapAttribution: basemapSettings.basemapSelectSettingsGroup.customMapAttribution.value.toString(),
            mapboxCustomStyleUrl: basemapSettings.mapBoxSettingsGroup.mapboxCustomStyleUrl.value.toString(),
            mapboxStyle: basemapSettings.mapBoxSettingsGroup.mapboxStyle.value.value.toString(),
            mapboxAccessToken: basemapSettings.mapBoxSettingsGroup.mapboxAccessToken.value.toString(),
            declutterLabels: basemapSettings.mapBoxSettingsGroup.declutterLabels.value,
            maptilerApiKey: basemapSettings.maptilerSettingsGroup.maptilerApiKey.value.toString(),
            maptilerStyle: basemapSettings.maptilerSettingsGroup.maptilerStyle.value.value.toString()
        };
    }

    private getMapToolsOptions(): MapToolsOptions {
        const maptoolsSettings = this.visualFormattingSettingsModel.mapControlsVisualCardSettings;
        return {

            lockMapExtent: maptoolsSettings.mapToolsSettingsGroup.lockMapExtent.value,
            showZoomControl: maptoolsSettings.mapToolsSettingsGroup.showZoomControl.value,
            lockedMapExtent: maptoolsSettings.mapToolsSettingsGroup.lockedMapExtent.value,
            lockedMapZoom: maptoolsSettings.mapToolsSettingsGroup.lockedMapZoom.value,
            legendPosition: maptoolsSettings.legendContainerSettingsGroup.legendPosition.value.value.toString(),
            legendBorderWidth: maptoolsSettings.legendContainerSettingsGroup.legendBorderWidth.value,
            legendBorderColor: maptoolsSettings.legendContainerSettingsGroup.legendBorderColor.value.value,
            legendBackgroundColor: maptoolsSettings.legendContainerSettingsGroup.legendBackgroundColor.value.value,
            legendBackgroundOpacity: maptoolsSettings.legendContainerSettingsGroup.legendBackgroundOpacity.value / 100,
            legendBorderRadius: maptoolsSettings.legendContainerSettingsGroup.legendBorderRadius.value,
            legendBottomMargin: maptoolsSettings.legendContainerSettingsGroup.legendBottomMargin.value,
            legendTopMargin: maptoolsSettings.legendContainerSettingsGroup.legendTopMargin.value,
            legendLeftMargin: maptoolsSettings.legendContainerSettingsGroup.legendLeftMargin.value,
            legendRightMargin: maptoolsSettings.legendContainerSettingsGroup.legendRightMargin.value
        };
    }

    private getCircleOptions(): CircleOptions {
        const circleSettings = this.visualFormattingSettingsModel.ProportionalCirclesVisualCardSettings;
        return {
            layerControl: circleSettings.topLevelSlice.value,
            color1: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCircles1Color.value.value,
            color2: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCircles2Color.value.value,
            minRadius: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCirclesMinimumRadius.value,
            maxRadius: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCirclesMaximumRadius.value,
            strokeColor: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCirclesStrokeColor.value.value,
            strokeWidth: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCirclesStrokeWidth.value,
            layer1Opacity: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCircles1LayerOpacity.value / 100,
            layer2Opacity: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCircles2LayerOpacity.value / 100,
            showLegend: circleSettings.proportionalCircleLegendSettingsGroup.showLegend.value,
            legendTitle: circleSettings.proportionalCircleLegendSettingsGroup.legendTitle.value,
            legendTitleColor: circleSettings.proportionalCircleLegendSettingsGroup.legendTitleColor.value.value,
            legendItemStrokeColor: circleSettings.proportionalCircleLegendSettingsGroup.legendItemStrokeColor.value.value,
            legendItemStrokeWidth: circleSettings.proportionalCircleLegendSettingsGroup.legendItemStrokeWidth.value,
            leaderLineStrokeWidth: circleSettings.proportionalCircleLegendSettingsGroup.leaderLineStrokeWidth.value,
            leaderLineColor: circleSettings.proportionalCircleLegendSettingsGroup.leaderLineColor.value.value,
            labelTextColor: circleSettings.proportionalCircleLegendSettingsGroup.labelTextColor.value.value,
            roundOffLegendValues: circleSettings.proportionalCircleLegendSettingsGroup.roundOffLegendValues.value,
            hideMinIfBelowThreshold: circleSettings.proportionalCircleLegendSettingsGroup.hideMinIfBelowThreshold.value,
            minValueThreshold: circleSettings.proportionalCircleLegendSettingsGroup.minValueThreshold.value,
            minRadiusThreshold: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCirclesMinimumRadius.value,
            labelSpacing: circleSettings.proportionalCircleLegendSettingsGroup.labelSpacing.value,
            yPadding: circleSettings.proportionalCircleLegendSettingsGroup.yPadding.value,
            xPadding: circleSettings.proportionalCircleLegendSettingsGroup.xPadding.value

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

            invertColorRamp: choroplethDisplaySettings.invertColorRamp.value,
            colorMode: choroplethDisplaySettings.colorMode.value.value.toString(),
            colorRamp: choroplethDisplaySettings.colorRamp.value.value.toString(),
            customColorRamp: choroplethDisplaySettings.customColorRamp.value,

            classes: choroplethClassificationSettings.numClasses.value,
            classificationMethod: choroplethClassificationSettings.classificationMethod.value.value.toString(),
            strokeColor: choroplethDisplaySettings.strokeColor.value.value,
            strokeWidth: choroplethDisplaySettings.strokeWidth.value,
            layerOpacity: choroplethDisplaySettings.layerOpacity.value / 100,
            showLegend: choroplethLegendSettings.showLegend.value,
            legendTitle: choroplethLegendSettings.legendTitle.value,
            legendTitleAlignment: choroplethLegendSettings.legendTitleAlignment.value.value.toString(),
            legendOrientation: choroplethLegendSettings.legendOrientation.value.value.toString(),
            legendLabelPosition: choroplethLegendSettings.legendLabelPosition.value.value.toString(),
            legendTitleColor: choroplethLegendSettings.legendTitleColor.value.value,
            legendLabelsColor: choroplethLegendSettings.legendLabelsColor.value.value,
            legendItemMargin: choroplethLegendSettings.legendItemMargin.value,
        };
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

    private persistCurrentExtentAsLocked(extentString: string, zoom: number) {
        this.host.persistProperties({
            merge: [{
                objectName: "mapControlsVisualCardSettings",
                properties: { lockedMapExtent: extentString, lockedMapZoom: zoom },
                selector: null
            }]
        });
    }

}


