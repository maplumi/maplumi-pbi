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
import * as d3 from "d3";
import { LegendService } from "./services/LegendService";
import { MapService } from "./services/MapService";
import { ChoroplethDataService } from "./services/ChoroplethDataService";
import { ColorRampManager } from "./services/ColorRampManager";
import type { Extent } from "ol/extent";
import { CacheService } from "./services/CacheService";
import { MapToolsOrchestrator } from "./orchestration/MapToolsOrchestrator";
import { View } from "ol";
import { ChoroplethOrchestrator } from "./orchestration/ChoroplethOrchestrator";
import { CircleOrchestrator } from "./orchestration/CircleOrchestrator";
import { OptionsService } from "./services/OptionsService";
import { ColorRampHelper } from "./services/ColorRampHelper";
import { DataRoleService } from "./services/DataRoleService";
import { DomIds, LegendPositions, VisualObjectNames, VisualObjectProps } from "./constants/strings";
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
            this.svgOverlay.id = DomIds.SvgOverlay
            this.svgOverlay.style.position = 'absolute';
            this.svgOverlay.style.top = '0';
            this.svgOverlay.style.left = '0';
            this.svgOverlay.style.width = '100%';
            this.svgOverlay.style.height = '100%';
            this.svgOverlay.style.pointerEvents = 'none'; // Let the map handle pointer events by default
        }

        this.svg = d3.select(this.svgOverlay);
        this.svgContainer = document.createElement('div'); // svg node container     
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
            ).then(layer => { this.choroplethLayer = layer; });
        } else {

            const group = this.svg.select(`#${DomIds.ChoroplethGroup}`);

            group.selectAll("*").remove();  // Clear children

            if (this.choroplethLayer) {
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
            this.circleLayer = layer;
        } else {

            const group1 = this.svg.select(`#${DomIds.CirclesGroup1}`);
            const group2 = this.svg.select(`#${DomIds.CirclesGroup2}`);

            // Always clean up children
            group1.selectAll("*").remove();
            group2.selectAll("*").remove();

            if (this.circleLayer) {
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

    // getBasemapOptions/getMapToolsOptions/getCircleOptions/getChoroplethOptions moved to OptionsService

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


