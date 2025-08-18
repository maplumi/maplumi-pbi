"use strict";

import powerbi from "powerbi-visuals-api";
import * as d3 from "d3";
import { DomIds, ClassificationMethods } from "../constants/strings";
import Map from "ol/Map";
import { ChoroplethDataService } from "../services/ChoroplethDataService";
import { LegendService } from "../services/LegendService";
import { ChoroplethLayer } from "../layers/choroplethLayer";
import { ChoroplethData, ChoroplethDataSet, ChoroplethLayerOptions, ChoroplethOptions, MapToolsOptions } from "../types";
import { ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.extensibility.ISelectionId;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import * as requestHelpers from "../utils/requestHelpers";
import { VisualConfig } from "../config/VisualConfig";
import { GeoBoundariesService } from "../services/GeoBoundariesService";
import { CacheService } from "../services/CacheService";

export class ChoroplethOrchestrator {
    private svg: d3.Selection<SVGElement, unknown, HTMLElement, any>;
    private svgOverlay: SVGSVGElement;
    private svgContainer: HTMLElement;
    private legendService: LegendService;
    private host: IVisualHost;
    private map: Map;
    private selectionManager: ISelectionManager;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private cacheService: CacheService;

    private choroplethLayer: ChoroplethLayer | undefined;
    private abortController: AbortController | null = null;
    private choroplethOptsBuilder: ChoroplethLayerOptionsBuilder;

    constructor(args: {
        svg: d3.Selection<SVGElement, unknown, HTMLElement, any>;
        svgOverlay: SVGSVGElement;
        svgContainer: HTMLElement;
        legendService: LegendService;
        host: IVisualHost;
        map: Map;
        selectionManager: ISelectionManager;
        tooltipServiceWrapper: ITooltipServiceWrapper;
        cacheService: CacheService;
    }) {
    super(args);
    this.cacheService = args.cacheService;
        this.choroplethOptsBuilder = new ChoroplethLayerOptionsBuilder({
            svg: this.svg,
            svgContainer: this.svgContainer,
            selectionManager: this.selectionManager,
            tooltipServiceWrapper: this.tooltipServiceWrapper,
        });
    }

    public getLayer(): ChoroplethLayer | undefined {
        return this.choroplethLayer;
    }

    public setSelectedIds(selectionIds: ISelectionId[]) {
        if (this.choroplethLayer) this.choroplethLayer.setSelectedIds(selectionIds);
    }

    public async render(
        categorical: any,
        choroplethOptions: ChoroplethOptions,
        dataService: ChoroplethDataService,
        mapToolsOptions: MapToolsOptions
    ): Promise<ChoroplethLayer | undefined> {
        if (choroplethOptions.layerControl == false) {
        const group = this.svg.select(`#${DomIds.ChoroplethGroup}`);
            group.selectAll("*").remove();
            if (this.choroplethLayer) {
                this.map.removeLayer(this.choroplethLayer);
                this.choroplethLayer = undefined;
            }
            this.legendService.hideLegend("choropleth");
            return undefined;
        }

    const group = this.svg.select(`#${DomIds.ChoroplethGroup}`);
        group.selectAll("*").remove();
        this.svgOverlay.style.display = 'flex';

    const validation = validateChoroplethInput(categorical);
    if (!validation.ok) { this.messages.missingMeasures(); return undefined; }

        const { AdminPCodeNameIDCategory, colorMeasure, pCodes } = parseChoroplethCategorical(categorical);
        if (!AdminPCodeNameIDCategory || !colorMeasure || !pCodes) return undefined;

    const validPCodes = filterValidPCodes(pCodes);
    if (validPCodes.length === 0) { this.messages.noValidPCodes(); return undefined; }

        const { colorValues, classBreaks, colorScale, pcodeKey, dataPoints } =
            this.prepareChoroplethData(categorical, choroplethOptions, AdminPCodeNameIDCategory, colorMeasure, pCodes, dataService);

        await this.fetchAndRenderChoroplethLayer(
            choroplethOptions,
            AdminPCodeNameIDCategory,
            colorMeasure,
            colorValues,
            classBreaks,
            colorScale,
            pcodeKey,
            dataPoints,
            dataService,
            mapToolsOptions
        );

        if (this.choroplethLayer) {
            if (choroplethOptions.showLegend) {
                this.legendService.getChoroplethLegendContainer()?.setAttribute("style", "display:flex");
                this.legendService.createChoroplethLegend(colorValues, classBreaks as any, colorScale as any, choroplethOptions);
                this.legendService.showLegend('choropleth');
            } else {
                this.legendService.hideLegend('choropleth');
            }
        }

        return this.choroplethLayer;
    }

    // parsing moved to src/data/choropleth.ts

    private prepareChoroplethData(
        categorical: any,
        choroplethOptions: ChoroplethOptions,
        AdminPCodeNameIDCategory: any,
        colorMeasure: any,
        pCodes: string[],
        dataService: ChoroplethDataService
    ): ChoroplethDataSet {
        const colorValues: number[] = colorMeasure.values;
        const classBreaks = dataService.getClassBreaks(colorValues, choroplethOptions);
        const colorScale = dataService.getColorScale(classBreaks as any, choroplethOptions);
        const pcodeKey = choroplethOptions.locationPcodeNameId;
        const tooltips = dataService.extractTooltips(categorical);
        const dataPoints = pCodes.map((pcode, i) => {
            const selectionId = this.host.createSelectionIdBuilder()
                .withCategory(AdminPCodeNameIDCategory, i)
                .withMeasure(colorMeasure.source.queryName)
                .createSelectionId();
            return { pcode, value: colorValues[i], tooltip: tooltips[i], selectionId };
        });
    if (choroplethOptions.classificationMethod === ClassificationMethods.Unique && (classBreaks as any[]).length > 7) {
            this.messages.tooManyUniqueValues();
        }
        return { colorValues, classBreaks, colorScale, pcodeKey, dataPoints } as any;
    }

    private async fetchAndRenderChoroplethLayer(
        choroplethOptions: ChoroplethOptions,
        AdminPCodeNameIDCategory: any,
        colorMeasure: any,
        colorValues: number[],
        classBreaks: any,
        colorScale: any,
        pcodeKey: string,
        dataPoints: any[],
        dataService: ChoroplethDataService,
        mapToolsOptions: MapToolsOptions
    ): Promise<void> {
        let serviceUrl: string;
        let cacheKey: string;

        if (choroplethOptions.boundaryDataSource === "geoboundaries") {
            const validation = GeoBoundariesService.validateOptions(choroplethOptions);
            if (!validation.isValid) {
                this.host.displayWarningIcon("GeoBoundaries Configuration Error", `maplumiWarning: ${validation.message}`);
                return;
            }
            try {
                // Special case: efficiently support multiple countries by using a consolidated world dataset at ADM0
                if (GeoBoundariesService.isAllCountriesRequest(choroplethOptions)) {
                    serviceUrl = GeoBoundariesService.getAllCountriesUrl();
                    const boundaryFieldName = GeoBoundariesService.getBoundaryFieldName(choroplethOptions);
                    pcodeKey = boundaryFieldName;
                    cacheKey = `geoboundaries_${choroplethOptions.geoBoundariesReleaseType}_ALL_ADM0`;
                    console.log("Loading All Countries ADM0 boundaries (consolidated dataset)");
                } else {
                    const metadata = await GeoBoundariesService.fetchMetadata(choroplethOptions);
                    if (!metadata) {
                        this.host.displayWarningIcon("GeoBoundaries API Error", "maplumiWarning: Failed to fetch boundary metadata from GeoBoundaries API. Please check your settings.");
                        return;
                    }
                    serviceUrl = GeoBoundariesService.getDownloadUrl(metadata, true);
                    const boundaryFieldName = GeoBoundariesService.getBoundaryFieldName(choroplethOptions);
                    pcodeKey = boundaryFieldName;
                    cacheKey = `geoboundaries_${choroplethOptions.geoBoundariesReleaseType}_${choroplethOptions.geoBoundariesCountry}_${choroplethOptions.geoBoundariesAdminLevel}`;
                    console.log(`Loading ${GeoBoundariesService.getDataDescription(metadata)}`);
                }
            } catch (error) {
                this.host.displayWarningIcon("GeoBoundaries API Error", "maplumiWarning: Error connecting to GeoBoundaries API. Please check your network connection.");
                return;
            }
        } else {
            serviceUrl = choroplethOptions.topoJSON_geoJSON_FileUrl as any;
            // Cache by resource URL (not by location field) so different URLs don't collide
            cacheKey = `custom_${encodeURIComponent(serviceUrl || '')}`;
        }

        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();

        try {
            const data = await this.cacheService.getOrFetch(cacheKey, async () => {
                if (!requestHelpers.isValidURL(serviceUrl)) { this.messages.invalidGeoTopoUrl(); return null; }
                if (!requestHelpers.enforceHttps(serviceUrl)) { this.messages.geoTopoFetchNetworkError(); return null; }
                let response: Response;
                try {
                    response = await requestHelpers.fetchWithTimeout(serviceUrl, VisualConfig.NETWORK.FETCH_TIMEOUT_MS);
                } catch (e) {
                    this.messages.geoTopoFetchNetworkError(); return null;
                }
                if (!response.ok) {
                    this.messages.geoTopoFetchStatusError(response.status); return null;
                }
                const json = await response.json();
                if (!(await requestHelpers.isValidJsonResponse(json))) { this.messages.invalidGeoTopoData(); return null; }
                return { data: json, response };
            }, { respectCacheHeaders: true });

            if (!data || !choroplethOptions.layerControl) return;

            let processedGeoData;
            try {
                processedGeoData = dataService.processGeoData(
                    data,
                    pcodeKey,
                    AdminPCodeNameIDCategory.values,
                    choroplethOptions.topojsonObjectName
                );
            } catch (e: any) {
                this.host.displayWarningIcon(
                    "Invalid Geo/TopoJSON Data",
                    "maplumiWarning: The boundary data isn't valid GeoJSON (FeatureCollection with features). " +
                    "Please verify the URL, selected object name, and file format."
                );
                return;
            }

            const layerOptions: ChoroplethLayerOptions = {
                geojson: processedGeoData,
                strokeColor: choroplethOptions.strokeColor,
                strokeWidth: choroplethOptions.strokeWidth,
                fillOpacity: choroplethOptions.layerOpacity,
                colorScale: (value: any) => dataService.getColorFromClassBreaks(value, classBreaks, colorScale, choroplethOptions.classificationMethod),
                dataKey: pcodeKey,
                categoryValues: AdminPCodeNameIDCategory.values,
                measureValues: colorMeasure.values,
                dataPoints,
                simplificationStrength: choroplethOptions.simplificationStrength,
            });

            this.renderChoroplethLayerOnMap(layerOptions, mapToolsOptions);
    } catch (error) { this.messages.choroplethFetchError(); }
    }

    private renderChoroplethLayerOnMap(
        layerOptions: ChoroplethLayerOptions,
        mapToolsOptions: MapToolsOptions
    ): void {
        if (this.choroplethLayer) {
            this.map.removeLayer(this.choroplethLayer);
        }
        this.choroplethLayer = new ChoroplethLayer(layerOptions);
        this.map.addLayer(this.choroplethLayer);
        if (mapToolsOptions.lockMapExtent === false) {
            const extent = this.choroplethLayer.getFeaturesExtent();
            if (extent) this.map.getView().fit(extent, VisualConfig.MAP.FIT_OPTIONS);
        }
    }
}
