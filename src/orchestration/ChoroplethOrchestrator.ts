"use strict";

import powerbi from "powerbi-visuals-api";
import * as d3 from "d3";
import Map from "ol/Map";
import { VisualConfig } from "../config/VisualConfig";
import { ChoroplethDataService } from "../services/ChoroplethDataService";
import { LegendService } from "../services/LegendService";
import { ChoroplethLayer } from "../layers/choroplethLayer";
import { ChoroplethData, ChoroplethDataSet, ChoroplethLayerOptions, ChoroplethOptions, MapToolsOptions } from "../types";
import { ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.extensibility.ISelectionId;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import * as requestHelpers from "../utils/requestHelpers";
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
        this.svg = args.svg;
        this.svgOverlay = args.svgOverlay;
        this.svgContainer = args.svgContainer;
        this.legendService = args.legendService;
        this.host = args.host;
        this.map = args.map;
        this.selectionManager = args.selectionManager;
        this.tooltipServiceWrapper = args.tooltipServiceWrapper;
        this.cacheService = args.cacheService;
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
            const group = this.svg.select(`#choropleth-group`);
            group.selectAll("*").remove();
            if (this.choroplethLayer) {
                this.map.removeLayer(this.choroplethLayer);
                this.choroplethLayer = undefined;
            }
            this.legendService.hideLegend("choropleth");
            return undefined;
        }

        const group = this.svg.select(`#choropleth-group`);
        group.selectAll("*").remove();
        this.svgOverlay.style.display = 'flex';

        if (!this.validateChoroplethInputData(categorical)) return undefined;

        const { AdminPCodeNameIDCategory, colorMeasure, pCodes } = this.extractChoroplethData(categorical);
        if (!AdminPCodeNameIDCategory || !colorMeasure || !pCodes) return undefined;

        const validPCodes = this.filterValidPCodes(pCodes);
        if (validPCodes.length === 0) return undefined;

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

    private validateChoroplethInputData(categorical: any): boolean {
        if (!categorical.values || categorical.values.length === 0) {
            this.host.displayWarningIcon("Measures not found", "maplumiWarning: Measures field is missing. Please ensure it is included in your data.");
            return false;
        }
        return true;
    }

    private extractChoroplethData(categorical: any): ChoroplethData {
        const AdminPCodeNameIDCategory = categorical.categories.find((c: any) => c.source?.roles && c.source.roles["AdminPCodeNameID"]);
        if (!AdminPCodeNameIDCategory) {
            this.host.displayWarningIcon("Admin PCode/Name/ID not found", "maplumiWarning: Admin PCode/Name/ID field is missing. Please ensure it is included in your data.");
            return { AdminPCodeNameIDCategory: undefined, colorMeasure: undefined, pCodes: undefined };
        }
        const colorMeasure = categorical.values.find((c: any) => c.source?.roles && c.source.roles["Color"]);
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
        if (choroplethOptions.classificationMethod === "u" && (classBreaks as any[]).length > 7) {
            this.host.displayWarningIcon(
                "Too many unique values for unique value classification.",
                "maplumiWarning: Only the top 7 unique values are mapped to colors; all others are shown in black. Please select a different classification method for better results."
            );
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
            cacheKey = `custom_${choroplethOptions.locationPcodeNameId}`;
        }

        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();

        try {
            const data = await this.cacheService.getOrFetch(cacheKey, async () => {
                if (!requestHelpers.isValidURL(serviceUrl)) {
                    this.host.displayWarningIcon("Invalid Geo/TopoJSON URL", "maplumiWarning: The provided GeoJSON URL is not valid. Please check the data source URL.");
                    return null;
                }
                let response: Response;
                try {
                    response = await window.fetch(serviceUrl, { signal: this.abortController!.signal });
                } catch (e) {
                    this.host.displayWarningIcon("Geo/TopoJSON Fetch Error", "maplumiWarning: Failed to fetch Geo/TopoJSON data. Please check your network connection or the data source URL.");
                    return null;
                }
                if (!response.ok) {
                    this.host.displayWarningIcon("Geo/TopoJSON Fetch Error", `maplumiWarning: Failed to fetch Geo/TopoJSON data. Server responded with status: ${response.status}`);
                    return null;
                }
                const json = await response.json();
                if (!(await requestHelpers.isValidJsonResponse(json))) {
                    this.host.displayWarningIcon("Invalid Geo/TopoJSON Data", "maplumiWarning: The fetched Geo/TopoJSON data is not valid. Please check the data source.");
                    return null;
                }
                return json;
            });

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
                svg: this.svg,
                svgContainer: this.svgContainer,
                zIndex: 5,
                categoryValues: AdminPCodeNameIDCategory.values,
                measureValues: colorMeasure.values,
                selectionManager: this.selectionManager,
                tooltipServiceWrapper: this.tooltipServiceWrapper,
                dataPoints
            };

            this.renderChoroplethLayerOnMap(layerOptions, mapToolsOptions);
        } catch (error) {
            this.host.displayWarningIcon("Error fetching data", "maplumiWarning: An error occurred while fetching the choropleth data. Please check the URL and your network connection.");
        }
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
