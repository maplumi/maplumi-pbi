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

import { MaplumiVisualFormattingSettingsModel } from "./settings"; import "ol/ol.css";
import Map from "ol/Map";
import { BasemapOptions, ChoroplethLayerOptions, ChoroplethOptions, CircleData, CircleLayerOptions, CircleOptions, MapToolsOptions } from "./types/index";
import { CircleLayer } from "./circleLayer";
import { ChoroplethLayer } from "./choroplethLayer";
import * as d3 from "d3";
import * as util from "./utils/utils"
import { LegendService } from "./services/LegendService";
import { MapService } from "./services/MapService";
import { DataService } from "./services/DataService";
import { ColorRampService } from "./services/ColorRampService";
import { Extent } from "ol/extent";
import { MapConfig } from "./config/MapConfig";
export class MaplumiVisual implements IVisual {

    private host: IVisualHost;
    private formattingSettingsService: FormattingSettingsService;
    private visualFormattingSettingsModel: MaplumiVisualFormattingSettingsModel;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private selectionManager: ISelectionManager;
    private container: HTMLElement;
    private svgContainer: HTMLElement;
    private legendContainer: HTMLElement;
    private colorRampService: ColorRampService;
    private legendService: LegendService;
    private mapService: MapService;
    private dataService: DataService;
    private svgOverlay: SVGSVGElement;
    private svg: d3.Selection<SVGElement, unknown, HTMLElement, any>;
    private map: Map;
    private mapToolsOptions: MapToolsOptions;
    private circleLayer: CircleLayer;
    private choroplethLayer: ChoroplethLayer;
    private mapExtent: Extent | undefined;
    private choroplethDisplayed: boolean = false;
    private memoryCache: Record<string, { data: any; timestamp: number }>;
    private abortController: AbortController | null = null;

    constructor(options: VisualConstructorOptions) {

        this.host = options.host;

        this.memoryCache = {};

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
        this.mapService = new MapService(this.container);

        this.map = this.mapService.getMap();

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

        // Update Legend Container
        this.updateLegendContainer();

        this.colorRampService = new ColorRampService(choroplethOptions.colorRamp);
        this.dataService = new DataService(this.colorRampService);

        const dataView = options.dataViews[0];

        // Check data validity
        if (!dataView || !dataView.categorical) {

            console.log("No categorical data found.");
            return;
        }

        this.choroplethDisplayed = choroplethOptions.layerControl;

        this.mapService.updateBasemap(basemapOptions);

        // draw choropleth
        this.handleLayer(
            choroplethOptions.layerControl,
            'choropleth-group',
            this.renderChoroplethLayer,
            dataView.categorical,
            choroplethOptions
        );

        // draw proportional circles
        this.handleLayer(
            circleOptions.layerControl,
            'circles-group-1',
            this.renderCircleLayer,
            dataView.categorical,
            circleOptions,
            ['circles-group-2']
        );

        // Clear entire SVG if all layers are off
        if (!choroplethOptions.layerControl && !circleOptions.layerControl) {
            this.svg.selectAll('*').remove();
        }

        // Force the map to update its size, for example when the visual window is resized
        this.map.updateSize();

    }

    // Helper function to handle layer visibility and rendering
    private handleLayer(
        shouldRender: boolean,
        groupId: string,
        renderFunction: (data: any, options: any) => void,
        data: any,
        options: any,
        relatedGroupIds: string[] = []
    ) {
        const group = this.svg.select(`#${groupId}`);

        // Always clean up before re-rendering to avoid duplication
        group.selectAll("*").remove();  // Clear children, not the group itself

        if (relatedGroupIds.length > 0) {
            relatedGroupIds.forEach((id) => {
                this.svg.select(`#${id}`).remove();
            });
        }

        if (shouldRender) {
            renderFunction.call(this, data, options);
        }

        // Call this in handleLayer when disabling a layer
        if (!shouldRender) {
            this.cleanupLayers();
        }
    }

    private renderCircleLayer(categorical: any, circleOptions: CircleOptions): void {
        if (!circleOptions.layerControl) return; // Early exit if layer is off

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
            console.warn("Longitude and Latitude have different lengths.");
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

        this.updateCircleLayer(circleLayerOptions);

        if (circleOptions.showLegend) {
            this.renderCircleLegend(combinedCircleSizeValues, minCircleSizeValue, circleScale, circleOptions);
        }
    }

    private extractCircleData(categorical: any): CircleData {
        const lonCategory = categorical?.categories?.find((c) => c.source?.roles?.Longitude);
        const latCategory = categorical?.categories?.find((c) => c.source?.roles?.Latitude);

        if (!lonCategory || !latCategory) {
            console.warn("Both Longitude and Latitude roles must be assigned.");
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
            circleScale = 0; // No scaling needed, use the minimum radius
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

    private updateCircleLayer(circleLayerOptions: CircleLayerOptions): void {
        // Remove existing CircleLayer if it exists
        if (this.circleLayer) {
            this.map.removeLayer(this.circleLayer);
        }

        // Create and add the new CircleLayer
        this.circleLayer = new CircleLayer(circleLayerOptions);
        this.map.addLayer(this.circleLayer);

        if (!this.choroplethDisplayed) {
            this.mapExtent = this.circleLayer.getFeaturesExtent();
            this.map.getView().fit(this.mapExtent, MapConfig.MAP.FIT_OPTIONS);
        }
    }

    private renderCircleLegend(
        combinedCircleSizeValues: number[],
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
            combinedCircleSizeValues.length,
            circleOptions
        );

        this.legendService.showLegend("circle");
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

        if (!colorMeasure) {
            console.warn("Color Measure not found.");
            return;
        }

        // Get PCodes (this is the category/feature identifier)
        const pCodes = AdminPCodeNameIDCategory.values as string[];
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

        const colorValues: number[] = colorMeasure.values;
        const classBreaks = this.dataService.getClassBreaks(colorValues, choroplethOptions);
        const colorScale = this.dataService.getColorScale(classBreaks, choroplethOptions);
        const pcodeKey = choroplethOptions.locationPcodeNameId;

        // Extract tooltips
        const tooltips = this.dataService.extractTooltips(categorical);

        // Create data points for each feature
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
                MapConfig.CACHE.EXPIRY_MS)
                .then((data: any) => {
                    // Check if layer is still enabled after async operation
                    if (!choroplethOptions.layerControl) return;

                    const processedGeoData = this.dataService.processGeoData(data, choroplethOptions.locationPcodeNameId, AdminPCodeNameIDCategory.values);

                    const choroplethLayerOptions: ChoroplethLayerOptions = {
                        geojson: processedGeoData,
                        strokeColor: choroplethOptions.strokeColor,
                        strokeWidth: choroplethOptions.strokeWidth,
                        fillOpacity: choroplethOptions.layerOpacity,
                        colorScale: (value: any) => this.dataService.getColorFromClassBreaks(value, classBreaks, colorScale),
                        dataKey: pcodeKey,
                        svg: this.svg,
                        svgContainer: this.svgContainer,
                        zIndex: 5,
                        categoryValues: AdminPCodeNameIDCategory.values,
                        measureValues: colorMeasure.values,
                        tooltipServiceWrapper: this.tooltipServiceWrapper,
                        selectionManager: this.selectionManager,
                        dataPoints: dataPoints // Add dataPoints to the options
                    }

                    this.choroplethLayer = new ChoroplethLayer(choroplethLayerOptions);

                    this.map.addLayer(this.choroplethLayer);

                    this.mapExtent = this.choroplethLayer.getFeaturesExtent();

                    this.map.getView().fit(this.mapExtent, MapConfig.MAP.FIT_OPTIONS);

                    // Update the legend
                    if (choroplethOptions.showLegend) {
                        this.legendContainer.style.display = "block";

                        this.legendService.createChoroplethLegend(
                            colorValues,
                            classBreaks,
                            colorScale,
                            choroplethOptions
                        );

                        this.legendService.showLegend('choropleth');
                    } else {
                        this.legendService.hideLegend('choropleth');
                    }
                });

        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }

    private updateLegendContainer(): void {
        // Update legend container styles
        this.legendContainer.style.background = this.mapToolsOptions.legendBackgroundColor;
        this.legendContainer.style.opacity = this.mapToolsOptions.legendBackgroundOpacity.toString();
        this.legendContainer.style.border = `${this.mapToolsOptions.legendBorderWidth}px solid ${this.mapToolsOptions.legendBorderColor}`;
        this.legendContainer.style.borderRadius = `${this.mapToolsOptions.legendBorderRadius}px`;
        this.legendContainer.style.marginBottom = `${this.mapToolsOptions.legendBottomMargin}px`;

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

            usePredefinedColorRamp: choroplethDisplaySettings.usePredefinedColorRamp.value,
            invertColorRamp: choroplethDisplaySettings.invertColorRamp.value,
            colorMode: choroplethDisplaySettings.colorMode.value.value.toString(),
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


    private cleanupLayers() {
        if (this.circleLayer) {
            this.legendService.clearContainer(this.legendService.getCircleLegendContainer());
            // this.legendContainer.style.display = "none"; // Hide the legend
            this.map.removeLayer(this.circleLayer);
            this.circleLayer.setActive(false); // Ensure no further renders
            this.circleLayer = null;
        }
        if (this.choroplethLayer) {
            this.legendService.clearContainer(this.legendService.getChoroplethLegendContainer());
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

    private getFormattingSettings(options: VisualUpdateOptions) {
        return this.formattingSettingsService.populateFormattingSettingsModel(
            MaplumiVisualFormattingSettingsModel,
            options.dataViews[0]
        );
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(
            this.visualFormattingSettingsModel
        );
    }

}


