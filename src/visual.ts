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
import { MessageService } from "./services/MessageService";

import { MaplumiVisualFormattingSettingsModel } from "./settings"; import "ol/ol.css";
import Map from "ol/Map";
import { BasemapOptions, ChoroplethOptions, CircleOptions, MapToolsOptions } from "./types/index";
import type { CircleLayer } from "./layers/circleLayer";
import type { ChoroplethLayer } from "./layers/choroplethLayer";
import type { CircleCanvasLayer } from "./layers/canvas/circleCanvasLayer";
import type { ChoroplethCanvasLayer } from "./layers/canvas/choroplethCanvasLayer";
import * as d3 from "d3";
import { LegendService } from "./services/LegendService";
import { MapService } from "./services/MapService";
import { ChoroplethDataService } from "./services/ChoroplethDataService";
import { ColorRampManager } from "./services/ColorRampManager";
import type { Extent } from "ol/extent";
import { VisualConfig } from "./config/VisualConfig";
import { CacheService } from "./services/CacheService";
import { MapToolsOrchestrator } from "./orchestration/MapToolsOrchestrator";
import { View } from "ol";
import { ChoroplethOrchestrator } from "./orchestration/ChoroplethOrchestrator";
import { CircleOrchestrator } from "./orchestration/CircleOrchestrator";
import { OptionsService } from "./services/OptionsService";
import { ColorRampHelper } from "./services/ColorRampHelper";
import { DataRoleService } from "./services/DataRoleService";
import { DomIds, LegendPositions, VisualObjectNames, VisualObjectProps } from "./constants/strings";
import { isWebGLAvailable } from "./utils/render";
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
    private circleLayer: CircleLayer | CircleCanvasLayer;
    private choroplethLayer: ChoroplethLayer | ChoroplethCanvasLayer;
   
    private choroplethDisplayed: boolean = false;
    private cacheService: CacheService;
    
    // Auto-toggle removed: layers are user-driven via format pane toggles
    private events: IVisualEventService;
    
    private previousLockMapExtent: boolean | undefined;
    private mapToolsOrchestrator: MapToolsOrchestrator;
    private circleOrchestrator: CircleOrchestrator;
    private choroplethOrchestrator: ChoroplethOrchestrator;
    private messages: MessageService;

    constructor(options: VisualConstructorOptions) {

        this.host = options.host;
        this.events = options.host.eventService;
    this.messages = new MessageService(options.host);

        // Opt-in cache debug logging: enable via DevTools, localStorage, or URL query
        try {
            const already = (globalThis as any).__MAPLUMI_DEBUG_CACHE__ === true;
            const byLocalStorage = typeof localStorage !== 'undefined' && localStorage.getItem('maplumi:debugCache') === '1';
            const byQuery = typeof location !== 'undefined' && /(^|[?&])debugCache=1(&|$)/.test(location.search || '');
            if (!already && (byLocalStorage || byQuery)) {
                (globalThis as any).__MAPLUMI_DEBUG_CACHE__ = true;
                console.info('[Maplumi] Cache debug logging enabled');
            }
        } catch { /* ignore */ }

        this.formattingSettingsService = new FormattingSettingsService();
        this.visualFormattingSettingsModel = new MaplumiVisualFormattingSettingsModel();

        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService);
        this.selectionManager = this.host.createSelectionManager();

        this.container = options.element;

        //legend container
    this.legendContainer = document.createElement("div");
    this.legendContainer.setAttribute("id", DomIds.LegendContainer);
        this.legendContainer.style.position = "absolute";
        this.legendContainer.style.zIndex = "1000";
        this.legendContainer.style.display = "none"; // Hidden by default

        this.legendContainer.style.pointerEvents = 'none';

        this.container.appendChild(this.legendContainer);

        this.legendService = new LegendService(this.legendContainer);

        this.mapService = new MapService(this.container, this.mapToolsOptions?.showZoomControl !== false, this.host);
        this.map = this.mapService.getMap();
        this.view = this.mapService.getView();
        this.mapToolsOrchestrator = new MapToolsOrchestrator(this.map, this.mapService);

        // svg layer overlay
        this.svgOverlay = this.container.querySelector('svg');
        if (!this.svgOverlay) {
            this.svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            this.svgOverlay.id = DomIds.SvgOverlay;
            this.svgOverlay.style.position = 'absolute';
            this.svgOverlay.style.top = '0';
            this.svgOverlay.style.left = '0';
            this.svgOverlay.style.width = '100%';
            this.svgOverlay.style.height = '100%';
            // Let the map handle pan/zoom; hit-layer shapes explicitly enable pointer-events.
            this.svgOverlay.style.pointerEvents = 'none';
        }

        this.svg = d3.select(this.svgOverlay);
        // Container that holds our overlay elements (SVG and any canvases)
        this.svgContainer = document.createElement('div');
        this.svgContainer.style.position = 'absolute';
        this.svgContainer.style.top = '0';
        this.svgContainer.style.left = '0';
        this.svgContainer.style.width = '100%';
        this.svgContainer.style.height = '100%';
    // Let the map receive pan/zoom events; individual hit shapes enable pointer-events themselves.
    this.svgContainer.style.pointerEvents = 'none';
    this.svgContainer.style.zIndex = '100';

        // Ensure the overlay elements are mounted in the DOM so Canvas/SVG are visible above the map
        // (OpenLayers will also move this container into its layer element when rendering.)
        this.svgContainer.appendChild(this.svgOverlay);
        if (!this.container.contains(this.svgContainer)) {
            this.container.appendChild(this.svgContainer);
        }

        // Ensure legend container is part of DOM
        if (!this.legendContainer.parentElement) {
            this.container.appendChild(this.legendContainer);
        }

        // Subscribe to selection changes
        this.selectionManager.registerOnSelectCallback(() => {

            const selectionIds = this.selectionManager.getSelectionIds();

            // Update both layers if they exist
            if (this.circleOrchestrator) {
                this.circleOrchestrator.setSelectedIds(selectionIds as any);
                this.circleLayer?.changed();
            }
            if (this.choroplethOrchestrator) {
                this.choroplethOrchestrator.setSelectedIds(selectionIds as any);
                this.choroplethLayer?.changed();
            }
        });

        this.cacheService = new CacheService();

        // Instantiate orchestrators after svg and services are ready
        this.circleOrchestrator = new CircleOrchestrator({
            svg: this.svg as unknown as d3.Selection<SVGElement, unknown, HTMLElement, any>,
            svgOverlay: this.svgOverlay,
            svgContainer: this.svgContainer,
            legendService: this.legendService,
            host: this.host,
            map: this.map,
            selectionManager: this.selectionManager,
            tooltipServiceWrapper: this.tooltipServiceWrapper,
        });
        this.choroplethOrchestrator = new ChoroplethOrchestrator({
            svg: this.svg as unknown as d3.Selection<SVGElement, unknown, HTMLElement, any>,
            svgOverlay: this.svgOverlay,
            svgContainer: this.svgContainer,
            legendService: this.legendService,
            host: this.host,
            map: this.map,
            selectionManager: this.selectionManager,
            tooltipServiceWrapper: this.tooltipServiceWrapper,
            cacheService: this.cacheService,
        });
    }

    public update(options: VisualUpdateOptions) {
        this.events.renderingStarted(options);
        const dataView = options.dataViews[0];

        this.map.setView(this.view); // default view

        // Update formatting settings
        this.visualFormattingSettingsModel = this.formattingSettingsService
            .populateFormattingSettingsModel(MaplumiVisualFormattingSettingsModel, options.dataViews[0]);

        // Get latest options early for lockMapExtent
    this.mapToolsOptions = OptionsService.getMapToolsOptions(this.visualFormattingSettingsModel);
    // Gracefully fallback to canvas if WebGL is selected but unavailable
    if (this.mapToolsOptions.renderEngine === 'webgl' && !isWebGLAvailable()) {
        this.mapToolsOptions = { ...this.mapToolsOptions, renderEngine: 'canvas' } as any;
        // Keep the format pane value unchanged; this is a runtime fallback only
    }

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
    const basemapOptions = OptionsService.getBasemapOptions(this.visualFormattingSettingsModel);
    const circleOptions = OptionsService.getCircleOptions(this.visualFormattingSettingsModel);
    const choroplethOptions = OptionsService.getChoroplethOptions(this.visualFormattingSettingsModel);
    this.mapToolsOptions = OptionsService.getMapToolsOptions(this.visualFormattingSettingsModel);
    if (this.mapToolsOptions.renderEngine === 'webgl' && !isWebGLAvailable()) {
        this.mapToolsOptions = { ...this.mapToolsOptions, renderEngine: 'canvas' } as any;
    }

    // Auto-toggle removed: use user-driven settings directly
    // No computation or persistence of auto state
    circleOptions.layerControl = circleOptions.layerControl;
    choroplethOptions.layerControl = choroplethOptions.layerControl;


        // Dynamically toggle zoom control
        this.mapService.setZoomControlVisible(this.mapToolsOptions.showZoomControl);

        // Update legend container styles
        this.updateLegendContainer();

        // Create color ramp service and data service
    const selectedColorRamp = ColorRampHelper.selectColorRamp(
            choroplethOptions.colorRamp,
            choroplethOptions.customColorRamp,
            this.messages
        );

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
            // Delegate to orchestrator
            this.choroplethOrchestrator.render(
                dataView.categorical,
                choroplethOptions,
                this.dataService,
                this.mapToolsOptions
            ).then(layer => { this.choroplethLayer = layer as any; });
        } else {

            const group = this.svg.select(`#${DomIds.ChoroplethGroup}`);

            group.selectAll("*").remove();  // Clear children

            // Remove any canvas and hit overlay for canvas engine
            try { this.svg.select('#choropleth-hitlayer').remove(); } catch {}
            try {
                const el = this.svgContainer.querySelector('#choropleth-canvas');
                if (el && el.parentElement) el.parentElement.removeChild(el);
            } catch {}

            if (this.choroplethLayer) {
                try { (this.choroplethLayer as any).dispose?.(); } catch {}
                this.map.removeLayer(this.choroplethLayer);
                this.choroplethLayer = undefined; // Reset choropleth layer
            }

            this.legendService.hideLegend("choropleth");
        }

        if (circleOptions.layerControl == true) {
            // Delegate to orchestrator
            const layer = this.circleOrchestrator.render(
                dataView.categorical,
                circleOptions,
                this.dataService,
                this.mapToolsOptions,
                this.choroplethDisplayed
            );
            this.circleLayer = layer as any;
        } else {

            const group1 = this.svg.select(`#${DomIds.CirclesGroup1}`);
            const group2 = this.svg.select(`#${DomIds.CirclesGroup2}`);

            // Always clean up children
            group1.selectAll("*").remove();
            group2.selectAll("*").remove();

            // Remove any canvas and hit overlay for canvas engine
            try { this.svg.select('#circles-hitlayer').remove(); } catch {}
            try {
                const el = this.svgContainer.querySelector('#circles-canvas');
                if (el && el.parentElement) el.parentElement.removeChild(el);
            } catch {}

            if (this.circleLayer) {
                try { (this.circleLayer as any).dispose?.(); } catch {}
                this.map.removeLayer(this.circleLayer);
                this.circleLayer = undefined; // Reset circle layer
            }

            this.legendService.hideLegend("circle");
        }

        // Update legend container visibility based on layers' legend settings
        const parentLegendVisible =
            (choroplethOptions.layerControl === true && choroplethOptions.showLegend === true) ||
            (circleOptions.layerControl === true && circleOptions.showLegend === true);
        this.legendContainer.style.display = parentLegendVisible ? "block" : "none";

        this.map.updateSize();

        // Handle map extent locking via orchestrator
        this.mapToolsOrchestrator.attach(this.mapToolsOptions, (extentStr, zoom) =>
            this.persistCurrentExtentAsLocked(extentStr, zoom)
        );

        this.previousLockMapExtent = this.mapToolsOptions.lockMapExtent;
        this.events.renderingFinished(options);
    }


    // (legacy circle/choropleth methods removed; rendering handled by orchestrators)

    private updateLegendContainer(): void {

        const opacity = this.mapToolsOptions.legendBackgroundOpacity;
        const rgbaColor = this.legendService.hexToRgba(this.mapToolsOptions.legendBackgroundColor, opacity);
        this.legendContainer.style.backgroundColor = rgbaColor;

        // Update legend container styles
        //this.legendContainer.style.background = this.mapToolsOptions.legendBackgroundColor;
        //this.legendContainer.style.opacity = this.mapToolsOptions.legendBackgroundOpacity.toString();
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
            case LegendPositions.TopRight:
                this.legendContainer.style.top = '10px';
                this.legendContainer.style.right = '10px';
                break;
            case LegendPositions.TopLeft:
                this.legendContainer.style.top = '10px';
                this.legendContainer.style.left = '10px';
                break;
            case LegendPositions.BottomRight:
                this.legendContainer.style.bottom = '10px';
                this.legendContainer.style.right = '10px';
                break;
            case LegendPositions.TopCenter:
                this.legendContainer.style.top = '10px';
                this.legendContainer.style.left = '50%';
                this.legendContainer.style.transform = 'translateX(-50%)';
                break;
            case LegendPositions.BottomCenter:
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
            xPadding: circleSettings.proportionalCircleLegendSettingsGroup.xPadding.value,
            chartType: circleSettings.proportalCirclesDisplaySettingsGroup.chartType.value.value.toString(),
            scalingMethod: 'square-root' // Fixed scaling method for optimal visual perception

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

            // Boundary data source options
            boundaryDataSource: choroplethLocationSettings.boundaryDataSource.value.value.toString(),

            // GeoBoundaries-specific options
            geoBoundariesReleaseType: choroplethLocationSettings.geoBoundariesReleaseType.value.value.toString(),
            geoBoundariesCountry: choroplethLocationSettings.geoBoundariesCountry.value.value.toString(),
            geoBoundariesAdminLevel: choroplethLocationSettings.geoBoundariesAdminLevel.value.value.toString(),

            // Get boundary field ID from appropriate field based on data source
            sourceFieldID: choroplethLocationSettings.boundaryDataSource.value.value === "custom"
                ? choroplethLocationSettings.customBoundaryIdField.value
                : choroplethLocationSettings.boundaryIdField.value.value.toString(),

            locationPcodeNameId: choroplethLocationSettings.boundaryDataSource.value.value === "custom"
                ? choroplethLocationSettings.customBoundaryIdField.value
                : choroplethLocationSettings.boundaryIdField.value.value.toString(),
            topoJSON_geoJSON_FileUrl: choroplethLocationSettings.topoJSON_geoJSON_FileUrl.value,
            topojsonObjectName: choroplethLocationSettings.topojsonObjectName.value,

            invertColorRamp: choroplethDisplaySettings.invertColorRamp.value,
            colorMode: choroplethDisplaySettings.colorMode.value.value.toString(),
            colorRamp: choroplethDisplaySettings.colorRamp.value.value.toString(),
            customColorRamp: choroplethDisplaySettings.customColorRamp.value,

            classes: choroplethClassificationSettings.numClasses.value,
            classificationMethod: choroplethClassificationSettings.classificationMethod.value.value as any,
            strokeColor: choroplethDisplaySettings.strokeColor.value.value,
            strokeWidth: choroplethDisplaySettings.strokeWidth.value,
            layerOpacity: choroplethDisplaySettings.layerOpacity.value / 100,
            showLegend: choroplethLegendSettings.showLegend.value,
            legendTitle: choroplethLegendSettings.legendTitle.value,
            legendTitleAlignment: choroplethLegendSettings.legendTitleAlignment.value.value.toString(),
            legendOrientation: choroplethLegendSettings.legendOrientation.value.value as any,
            legendLabelPosition: choroplethLegendSettings.legendLabelPosition.value.value as any,
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
                objectName: VisualObjectNames.MapControls,
                properties: { [VisualObjectProps.LockedMapExtent]: extentString, [VisualObjectProps.LockedMapZoom]: zoom },
                selector: null
            }]
        });
    }

}


