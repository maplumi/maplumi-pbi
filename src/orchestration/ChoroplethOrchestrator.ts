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
import { BaseOrchestrator } from "./BaseOrchestrator";
import { ChoroplethLayerOptionsBuilder } from "../services/LayerOptionBuilders";
import { validateChoroplethInput, parseChoroplethCategorical, filterValidPCodes } from "../data/choropleth";
import { OpenDataSoftService } from "../services/OpenDataSoftService";
import { MaplumiService } from "../services/MaplumiService";

export class ChoroplethOrchestrator extends BaseOrchestrator {
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
                // Prefetch/update countries just-in-time before choropleth render
                try {
                    await GeoBoundariesService.getCountries(choroplethOptions.geoBoundariesReleaseType);
                } catch { /* ignore */ }
                const hasDownload = (md: any) => !!(md && (md.tjDownloadURL || md.gjDownloadURL));
                let usedRelease = choroplethOptions.geoBoundariesReleaseType;
                const boundaryFieldName = GeoBoundariesService.getBoundaryFieldName(choroplethOptions);
                pcodeKey = boundaryFieldName;

                // Single-country ADM1–ADM5 path
                let { data: metadata } = await GeoBoundariesService.fetchMetadata(choroplethOptions);

                // Fallback to gbOpen if selected release has no data
                if (!hasDownload(metadata) && usedRelease !== "gbOpen") {
                    const fallbackOpts = { ...choroplethOptions, geoBoundariesReleaseType: "gbOpen" as any };
                    const fallback = await GeoBoundariesService.fetchMetadata(fallbackOpts);
                    if (hasDownload(fallback.data)) {
                        metadata = fallback.data as any;
                        usedRelease = "gbOpen" as any;
                        this.host.displayWarningIcon(
                            "GeoBoundaries Fallback",
                            "maplumiWarning: No data found for the selected release type; falling back to gbOpen."
                        );
                    }
                }

                if (!hasDownload(metadata)) {
                    const msg = `No GeoBoundaries data found for ${choroplethOptions.geoBoundariesCountry} at ${choroplethOptions.geoBoundariesAdminLevel}. Supported levels are ADM1–ADM3. Try another level or release type.`;
                    this.host.displayWarningIcon("GeoBoundaries: No data for selected level", `maplumiWarning: ${msg}`);
                    return;
                }
                {
                    const urls = GeoBoundariesService.getPreferredDownloadUrls(metadata as any);
                    serviceUrl = urls[0] || "";
                }
                cacheKey = `geoboundaries_${usedRelease}_${choroplethOptions.geoBoundariesCountry}_${choroplethOptions.geoBoundariesAdminLevel}`;
                console.log(`Loading ${GeoBoundariesService.getDataDescription(metadata as any)}`);
            } catch (error) {
                this.host.displayWarningIcon("GeoBoundaries API Error", "maplumiWarning: Error connecting to GeoBoundaries API. Please check your network connection.");
                return;
            }
        } else if (choroplethOptions.boundaryDataSource === "opendatasoft") {
            // ODS provides a world ADM0 dataset; we always fetch full dataset then filter by pCodes
            try {
                // Cache the full dataset once; filtering happens later in processGeoData
                cacheKey = `ods_world_adm0`;
                const data = await this.cacheService.getOrFetch<any>(cacheKey as any, async () => {
                    const gj = await OpenDataSoftService.fetchWorldAdm0();
                    // basic validation
                    if (!(await requestHelpers.isValidJsonResponse(gj))) return null;
                    return gj;
                });
                if (!data) {
                    this.host.displayWarningIcon("OpenDataSoft Error", "maplumiWarning: Failed to fetch ODS world administrative boundaries.");
                    return;
                }
                serviceUrl = ""; // not used; we already have data in cache
            } catch (e) {
                this.host.displayWarningIcon("OpenDataSoft Error", "maplumiWarning: Error connecting to OpenDataSoft API.");
                return;
            }
    } else if (choroplethOptions.boundaryDataSource === "maplumi") {
            // Maplumi provides a self-hosted CGAZ ADM0 world dataset; fetch once and filter by pCodes
            try {
                cacheKey = `maplumi_world_cgaz_adm0`;
                const data = await this.cacheService.getOrFetch<any>(cacheKey as any, async () => {
                    const gj = await MaplumiService.fetchWorldAdm0();
                    if (!(await requestHelpers.isValidJsonResponse(gj))) return null;
                    return gj;
                });
                if (!data) {
                    this.host.displayWarningIcon("Maplumi Error", "maplumiWarning: Failed to fetch Maplumi world ADM0 boundaries.");
                    return;
                }
                serviceUrl = "";
            } catch (e) {
                this.host.displayWarningIcon("Maplumi Error", "maplumiWarning: Error connecting to Maplumi boundary service.");
                return;
            }
        } else if (choroplethOptions.boundaryDataSource === "worldatlas") {
            try {
                cacheKey = `worldatlas_countries_110m`;
                const data = await this.cacheService.getOrFetch<any>(cacheKey as any, async () => {
                    const scale = (choroplethOptions.worldAtlasScale || "110m").toLowerCase();
                    const url = scale === "10m"
                        ? VisualConfig.WORLDATLAS.COUNTRIES_10M_URL
                        : scale === "50m"
                            ? VisualConfig.WORLDATLAS.COUNTRIES_50M_URL
                            : VisualConfig.WORLDATLAS.COUNTRIES_110M_URL;
                    const response = await requestHelpers.fetchWithTimeout(url, VisualConfig.NETWORK.FETCH_TIMEOUT_MS);
                    if (!response.ok) return null;
                    const json = await response.json();
                    if (!(await requestHelpers.isValidJsonResponse(json))) return null;
                    return json;
                });
                if (!data) {
                    this.host.displayWarningIcon("World Atlas Error", "maplumiWarning: Failed to fetch World Atlas ADM0 boundaries.");
                    return;
                }
                serviceUrl = "";
            } catch (e) {
                this.host.displayWarningIcon("World Atlas Error", "maplumiWarning: Error fetching World Atlas data.");
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
            let result: any;
            if (choroplethOptions.boundaryDataSource === "opendatasoft") {
                // Read the ODS dataset from cache
                result = this.cacheService.get<any>(cacheKey as any);
            } else {
                result = await this.cacheService.getOrFetch(cacheKey, async () => {
                    // When serviceUrl is set from candidates, try a small sequence of candidates instead of just one
                    const candidates = [serviceUrl];
                    // If we set serviceUrl from metadata candidates previously, it may be the best one already.
                    // Still attempt basic retry on derived simplified variants if possible.
                    try {
                        const u = new URL(serviceUrl);
                        const file = u.pathname.toLowerCase();
                        const all: string[] = [];
                        if (file.endsWith(".topojson")) {
                            all.push(serviceUrl);
                            all.push(GeoBoundariesService.withSimplifiedFilename(serviceUrl, "topojson"));
                            all.push(GeoBoundariesService.withSimplifiedFilename(serviceUrl, "geojson"));
                        } else if (file.endsWith(".geojson")) {
                            all.push(GeoBoundariesService.withSimplifiedFilename(serviceUrl, "geojson"));
                            all.push(serviceUrl);
                        }
                        // Normalize github.com to media host as well
                        const normed = all.map(a => GeoBoundariesService.normalizeGithubRaw(a) || a);
                        for (const x of normed) if (!candidates.includes(x)) candidates.push(x);
                    } catch { /* ignore */ }

                    for (const url of candidates) {
                        if (!requestHelpers.isValidURL(url)) { continue; }
                        if (!requestHelpers.enforceHttps(url)) { continue; }
                        let response: Response;
                        try {
                            response = await requestHelpers.fetchWithTimeout(url, VisualConfig.NETWORK.FETCH_TIMEOUT_MS);
                        } catch {
                            continue;
                        }
                        if (!response.ok) { continue; }
                        try {
                            const json = await response.json();
                            if (!(await requestHelpers.isValidJsonResponse(json))) { continue; }
                            return json;
                        } catch { continue; }
                    }
                    this.messages.geoTopoFetchNetworkError();
                    return null;
                }, /* options ignored by CacheService */ undefined as any);
            }

            if (!result || !choroplethOptions.layerControl) return;
            const data = result as any;

            let processedGeoData;
            try {
                const objectNameOverride = choroplethOptions.boundaryDataSource === "worldatlas"
                    ? (VisualConfig.WORLDATLAS.DEFAULT_OBJECT)
                    : choroplethOptions.topojsonObjectName;
                processedGeoData = dataService.processGeoData(
                    data,
                    pcodeKey,
                    AdminPCodeNameIDCategory.values,
                    objectNameOverride
                );
            } catch (e: any) {
                this.host.displayWarningIcon(
                    "Invalid Geo/TopoJSON Data",
                    "maplumiWarning: The boundary data isn't valid GeoJSON (FeatureCollection with features). " +
                    "Please verify the URL, selected object name, and file format."
                );
                return;
            }

            // For World Atlas, ensure the selected join key exists; if not, fallback to 'id'
            if (choroplethOptions.boundaryDataSource === "worldatlas") {
                const hasKey = (processedGeoData?.features || []).some((f: any) => {
                    const v = f?.properties ? f.properties[pcodeKey] : undefined;
                    return v !== undefined && v !== null && String(v).trim() !== "";
                });
                if (!hasKey && pcodeKey !== "id") {
                    const altKey = "id";
                    const altHas = (processedGeoData?.features || []).some((f: any) => {
                        const v = f?.properties ? f.properties[altKey] : undefined;
                        return v !== undefined && v !== null && String(v).trim() !== "";
                    });
                    if (altHas) {
                        pcodeKey = altKey;
                        this.host.displayWarningIcon(
                            "World Atlas join key adjusted",
                            `maplumiWarning: Selected Boundary ID Field '${choroplethOptions.sourceFieldID}' was not found on features; switched to 'id' (ISO numeric).`
                        );
                    } else {
                        this.host.displayWarningIcon(
                            "World Atlas data mismatch",
                            "maplumiWarning: No suitable join field ('name' or 'id') found in World Atlas data."
                        );
                    }
                }
            }

            // If no features matched, try to auto-detect a better join key for GeoBoundaries
            const normalize = (v: any): string => {
                if (v === null || v === undefined) return "";
                if (typeof v === "number") return String(v);
                return String(v).trim().toUpperCase();
            };
            const validSet = new Set((AdminPCodeNameIDCategory.values || []).map(normalize));
            const matchedCount = (processedGeoData?.features || []).reduce((acc: number, f: any) => {
                const key = f?.properties ? f.properties[pcodeKey] : undefined;
                return acc + (validSet.has(normalize(key)) ? 1 : 0);
            }, 0);

            if (
                matchedCount === 0 &&
                choroplethOptions.boundaryDataSource === "geoboundaries"
            ) {
                const candidateKeys = ["shapeID", "shapeISO", "shapeGroup", "shapeName"]; // preference order
                for (const candidate of candidateKeys) {
                    if (candidate === pcodeKey) continue;
                    try {
                        const alt = dataService.processGeoData(
                            data,
                            candidate,
                            AdminPCodeNameIDCategory.values,
                            choroplethOptions.topojsonObjectName
                        );
                        const altMatched = (alt?.features || []).reduce((acc: number, f: any) => {
                            const key = f?.properties ? f.properties[candidate] : undefined;
                            return acc + (validSet.has(normalize(key)) ? 1 : 0);
                        }, 0);
                        if (altMatched > 0) {
                            processedGeoData = alt;
                            pcodeKey = candidate; // use detected key for layer render
                            this.host.displayWarningIcon(
                                "GeoBoundaries join key adjusted",
                                `maplumiWarning: No features matched using '${choroplethOptions.sourceFieldID}'. ` +
                                `Automatically tried '${candidate}' and found matches. ` +
                                `Consider switching Boundary ID Field to '${candidate}'.`
                            );
                            break;
                        }
                    } catch {
                        // ignore and try next candidate
                    }
                }
            }

            const layerOptions = this.choroplethOptsBuilder.build({
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
                greyOutUnmatchedBoundaries: !!choroplethOptions.greyOutUnmatchedBoundaries,
                greyOutUnmatchedBoundariesColor: choroplethOptions.greyOutUnmatchedBoundariesColor,
                greyOutUnmatchedBoundariesOpacity: choroplethOptions.greyOutUnmatchedBoundariesOpacity,
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
