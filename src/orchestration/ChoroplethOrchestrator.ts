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
    let usingMergedAllCountries = false;

        if (choroplethOptions.boundaryDataSource === "geoboundaries") {
            const validation = GeoBoundariesService.validateOptions(choroplethOptions);
            if (!validation.isValid) {
                this.host.displayWarningIcon("GeoBoundaries Configuration Error", `maplumiWarning: ${validation.message}`);
                return;
            }
            try {
                const hasDownload = (md: any) => !!(md && (md.tjDownloadURL || md.gjDownloadURL));
                let usedRelease = choroplethOptions.geoBoundariesReleaseType;
                const boundaryFieldName = GeoBoundariesService.getBoundaryFieldName(choroplethOptions);
                pcodeKey = boundaryFieldName;

                // Special handling for ALL countries: fetch and merge only the countries referenced by the data's PCodes
                if (choroplethOptions.geoBoundariesCountry === "ALL" && choroplethOptions.geoBoundariesAdminLevel === "ADM0") {
                    // Ensure we can map PCodes to ISO3
                    if (!(boundaryFieldName === "shapeISO" || boundaryFieldName === "shapeGroup")) {
                        this.host.displayWarningIcon(
                            "GeoBoundaries Multi-Country",
                            "maplumiWarning: For 'All Countries', please use shapeISO or shapeGroup as the Boundary ID Field to enable selective country loading."
                        );
                        return;
                    }

                    // Derive target ISO list from the category values (pCodes)
                    const isoTargets = Array.from(new Set((AdminPCodeNameIDCategory.values || [])
                        .map((v: any) => String(v).trim().toUpperCase())
                        .filter((v: string) => v.length > 0)));
                    if (isoTargets.length === 0) {
                        this.host.displayWarningIcon("GeoBoundaries Multi-Country", "maplumiWarning: No country codes found in the data to load boundaries for.");
                        return;
                    }

                    // Only perform selective multi-country merge when there are enough distinct targets to benefit
                    const MIN_MERGE_THRESHOLD = 5;
                    if (isoTargets.length < MIN_MERGE_THRESHOLD) {
                        // For small sets, use the single-metadata path (keeps fallback behavior and reduces requests)
                        const { data: metadata } = await GeoBoundariesService.fetchMetadata(choroplethOptions);
                        if (!hasDownload(metadata) && usedRelease !== "gbOpen") {
                            const fallbackOpts = { ...choroplethOptions, geoBoundariesReleaseType: "gbOpen" as any };
                            const fallback = await GeoBoundariesService.fetchMetadata(fallbackOpts);
                            if (hasDownload(fallback.data)) {
                                // We'll compute serviceUrl from preferred candidates below
                                usedRelease = "gbOpen";
                                cacheKey = `geoboundaries_${usedRelease}_${choroplethOptions.geoBoundariesCountry}_${choroplethOptions.geoBoundariesAdminLevel}`;
                                this.host.displayWarningIcon(
                                    "GeoBoundaries Fallback",
                                    "maplumiWarning: No data found for the selected release type; falling back to gbOpen."
                                );
                                // proceed without merged path
                                console.log(`Loading ${GeoBoundariesService.getDataDescription(fallback.data as any)}`);
                                // skip the merged branch entirely
                                usingMergedAllCountries = false;
                                // exit early from ALL logic
                                // Note: subsequent code uses the set serviceUrl/cacheKey
                                // Set a provisional serviceUrl from candidates
                                const urls = GeoBoundariesService.getPreferredDownloadUrls(fallback.data as any);
                                serviceUrl = urls[0] || "";
                            } else {
                                this.host.displayWarningIcon("GeoBoundaries API Error", "maplumiWarning: Failed to fetch boundary metadata from GeoBoundaries API. Please check your settings.");
                                return;
                            }
                        } else if (hasDownload(metadata)) {
                            const urls = GeoBoundariesService.getPreferredDownloadUrls(metadata as any);
                            serviceUrl = urls[0] || "";
                            cacheKey = `geoboundaries_${usedRelease}_${choroplethOptions.geoBoundariesCountry}_${choroplethOptions.geoBoundariesAdminLevel}`;
                            console.log(`Loading ${GeoBoundariesService.getDataDescription(metadata as any)}`);
                        } else {
                            this.host.displayWarningIcon("GeoBoundaries API Error", "maplumiWarning: Failed to fetch boundary metadata from GeoBoundaries API. Please check your settings.");
                            return;
                        }
                        // Skip merged branch by continuing into the common fetch pipeline
                    } else {

                    // Fetch metadata list for the selected release; fallback to gbOpen if necessary
                    let allMeta = await GeoBoundariesService.fetchAllCountriesMetadataByRelease(usedRelease);
                    if ((!allMeta || allMeta.length === 0) && usedRelease !== "gbOpen") {
                        allMeta = await GeoBoundariesService.fetchAllCountriesMetadataByRelease("gbOpen");
                        if (allMeta && allMeta.length > 0) {
                            usedRelease = "gbOpen";
                            this.host.displayWarningIcon(
                                "GeoBoundaries Fallback",
                                "maplumiWarning: No data found for the selected release type; falling back to gbOpen."
                            );
                        }
                    }
                    if (!allMeta || allMeta.length === 0) {
                        this.host.displayWarningIcon("GeoBoundaries API Error", "maplumiWarning: Failed to fetch boundary metadata from GeoBoundaries API. Please check your settings.");
                        return;
                    }

                    // Index metadata by ISO code
                    const metaByISO: { [iso: string]: any } = Object.create(null);
                    for (const m of allMeta) {
                        const iso = (m.boundaryISO || "").toUpperCase();
                        if (iso) metaByISO[iso] = m;
                    }

                    // Composite cache key for merged dataset
                    const sortedIso = isoTargets.slice().sort().join("_");
                    cacheKey = `geoboundaries_multi_${usedRelease}_${sortedIso}_${choroplethOptions.geoBoundariesAdminLevel}`;

                    // Try cache first for merged result
            const cachedMerged = this.cacheService.get<any>(cacheKey as any);
                    if (!cachedMerged) {
                        // Fetch and merge datasets sequentially to avoid excessive concurrency
                        const mergedFeatures: any[] = [];
                        for (const iso of isoTargets) {
                const md = metaByISO[String(iso)];
                            if (!md) continue; // skip unknown
                            const candidates = GeoBoundariesService.getPreferredDownloadUrls(md);
                            const perKey = `geoboundaries_${usedRelease}_${iso}_${choroplethOptions.geoBoundariesAdminLevel}`;
                            const data = await this.cacheService.getOrFetch<any>(perKey, async () => {
                                for (const url of candidates) {
                                    if (!requestHelpers.isValidURL(url)) { continue; }
                                    if (!requestHelpers.enforceHttps(url)) { continue; }
                                    try {
                                        const resp = await requestHelpers.fetchWithTimeout(url, VisualConfig.NETWORK.FETCH_TIMEOUT_MS);
                                        if (!resp.ok) continue;
                                        const json = await resp.json();
                                        if (!(await requestHelpers.isValidJsonResponse(json))) continue;
                                        return json;
                                    } catch { /* try next */ }
                                }
                                return null;
                            });
                            if (!data) continue;
                            try {
                                // Convert and filter features per dataset, using the full AdminPCodeNameIDCategory.values as valid list
                                const geo = dataService.processGeoData(
                                    data,
                                    boundaryFieldName,
                                    AdminPCodeNameIDCategory.values,
                                    choroplethOptions.topojsonObjectName
                                );
                                if (geo && Array.isArray(geo.features)) {
                                    mergedFeatures.push(...geo.features);
                                }
                            } catch { /* skip problematic country */ }
                        }
                        const merged = { type: "FeatureCollection", features: mergedFeatures } as any;
                        // Cache merged result
                        this.cacheService.set(cacheKey, merged, VisualConfig.CACHE.EXPIRY_MS);
                    }
                    // Use merged dataset as if it's the downloaded data for the remaining pipeline
                    usingMergedAllCountries = true;
                    serviceUrl = ""; // Not used in merged path
                    }
                } else {
                    // Single-country path (existing behavior)
                    // First attempt: use the user-selected release type
                    let { data: metadata } = await GeoBoundariesService.fetchMetadata(choroplethOptions);

                    // Fallback: if no data for selected release and it's not gbOpen, try gbOpen
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
                        this.host.displayWarningIcon("GeoBoundaries API Error", "maplumiWarning: Failed to fetch boundary metadata from GeoBoundaries API. Please check your settings.");
                        return;
                    }
                    {
                        const urls = GeoBoundariesService.getPreferredDownloadUrls(metadata as any);
                        serviceUrl = urls[0] || "";
                    }
                    cacheKey = `geoboundaries_${usedRelease}_${choroplethOptions.geoBoundariesCountry}_${choroplethOptions.geoBoundariesAdminLevel}`;
                    console.log(`Loading ${GeoBoundariesService.getDataDescription(metadata as any)}`);
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
            let result: any;
            if (usingMergedAllCountries) {
                // Retrieve merged data directly from cache
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
