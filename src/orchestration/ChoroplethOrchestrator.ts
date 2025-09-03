"use strict";

import powerbi from "powerbi-visuals-api";
import * as d3 from "d3";
import { DomIds, ClassificationMethods } from "../constants/strings";
import Map from "ol/Map";
import { ChoroplethDataService } from "../services/ChoroplethDataService";
import { LegendService } from "../services/LegendService";
import { ChoroplethLayer } from "../layers/choroplethLayer";
import { ChoroplethWebGLLayer } from "../layers/webgl/choroplethWebGLLayer";
import { ChoroplethData, ChoroplethDataSet, ChoroplethLayerOptions, ChoroplethOptions, MapToolsOptions } from "../types";
import { ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.extensibility.ISelectionId;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import * as requestHelpers from "../utils/requestHelpers";
import { VisualConfig } from "../config/VisualConfig";
import { GeoBoundariesService } from "../services/GeoBoundariesService";
import { GeoBoundariesCatalogService } from "../services/GeoBoundariesCatalogService";
import { CacheService } from "../services/CacheService";
import { BaseOrchestrator } from "./BaseOrchestrator";
import { ChoroplethLayerOptionsBuilder } from "../services/LayerOptionBuilders";
import { filterValidPCodes, parseChoroplethCategorical, validateChoroplethInput } from "../data/choropleth";
import { MessageService } from "../services/MessageService";
import { ChoroplethCanvasLayer } from "../layers/canvas/choroplethCanvasLayer";

export class ChoroplethOrchestrator extends BaseOrchestrator {
    private cacheService: CacheService;

    private choroplethLayer: ChoroplethLayer | ChoroplethCanvasLayer | ChoroplethWebGLLayer | undefined;
    private abortController: AbortController | null = null;
    private choroplethOptsBuilder: ChoroplethLayerOptionsBuilder;
    // Persistent categorical mapping (stable category->color across filtering) for Unique classification
    private categoricalColorMap: globalThis.Map<any, string> = new globalThis.Map();
    private categoricalStableOrder: any[] = []; // first 7 sorted categories (stable across filtering until measure/method change)
    private lastClassificationMethod: string | undefined;
    private lastMeasureQueryName: string | undefined;

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
        this.messages = new MessageService(this.host);
        this.choroplethOptsBuilder = new ChoroplethLayerOptionsBuilder({
            svg: this.svg,
            svgContainer: this.svgContainer,
            selectionManager: this.selectionManager,
            tooltipServiceWrapper: this.tooltipServiceWrapper,
        });
    }

    public getLayer(): ChoroplethLayer | ChoroplethCanvasLayer | ChoroplethWebGLLayer | undefined {
        return this.choroplethLayer as any;
    }

    public setSelectedIds(selectionIds: ISelectionId[]) {
        if (this.choroplethLayer && (this.choroplethLayer as any).setSelectedIds) (this.choroplethLayer as any).setSelectedIds(selectionIds);
    }

    public async render(
        categorical: any,
        choroplethOptions: ChoroplethOptions,
        dataService: ChoroplethDataService,
        mapToolsOptions: MapToolsOptions
    ): Promise<ChoroplethLayer | ChoroplethCanvasLayer | ChoroplethWebGLLayer | undefined> {
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
            validPCodes,
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

    return this.choroplethLayer as any;
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
    let classBreaks = dataService.getClassBreaks(colorValues, choroplethOptions);
    let colorScale = dataService.getColorScale(classBreaks as any, choroplethOptions);
        const pcodeKey = choroplethOptions.locationPcodeNameId;
        const tooltips = dataService.extractTooltips(categorical);
        const dataPoints = pCodes.map((pcode, i) => {
            const selectionId = this.host.createSelectionIdBuilder()
                .withCategory(AdminPCodeNameIDCategory, i)
                .withMeasure(colorMeasure.source.queryName)
                .createSelectionId();
            return { pcode, value: colorValues[i], tooltip: tooltips[i], selectionId };
        });
        // Stable ordered categorical mapping for Unique classification
        if (choroplethOptions.classificationMethod === ClassificationMethods.Unique) {
            try {
                const measureQuery = colorMeasure?.source?.queryName;
                const enteringUnique = this.lastClassificationMethod !== ClassificationMethods.Unique;
                const measureChanged = measureQuery && measureQuery !== this.lastMeasureQueryName;

                const currentUnique = Array.from(new Set(colorValues.filter(v => v !== null && v !== undefined && !Number.isNaN(v))));
                const allNumeric = currentUnique.every(v => typeof v === 'number');
                const sortedCurrent = allNumeric
                    ? [...currentUnique].sort((a, b) => (a as number) - (b as number))
                    : [...currentUnique].sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));

                const basePalette = Array.isArray(colorScale) ? colorScale.slice(0, 7) : (Object.values(colorScale) as string[]).slice(0, 7);

                if (enteringUnique || measureChanged || this.categoricalStableOrder.length === 0) {
                    // Initialize stable palette from sortedCurrent
                    this.categoricalColorMap.clear();
                    this.categoricalStableOrder = [];
                    for (const cat of sortedCurrent) {
                        if (this.categoricalStableOrder.length < 7) {
                            this.categoricalStableOrder.push(cat);
                            this.categoricalColorMap.set(cat, basePalette[this.categoricalStableOrder.length - 1] || '#000000');
                        } else {
                            this.categoricalColorMap.set(cat, '#000000');
                        }
                    }
                } else {
                    // Append any new categories (preserve existing color assignments)
                    for (const cat of sortedCurrent) {
                        if (!this.categoricalColorMap.has(cat)) {
                            if (this.categoricalStableOrder.length < 7) {
                                this.categoricalStableOrder.push(cat);
                                this.categoricalColorMap.set(cat, basePalette[this.categoricalStableOrder.length - 1] || '#000000');
                            } else {
                                this.categoricalColorMap.set(cat, '#000000');
                            }
                        }
                    }
                }

                // Legend / breaks use only those stable categories that are present in current filter result
                const presentStable = this.categoricalStableOrder.filter(c => currentUnique.includes(c));
                classBreaks = presentStable;
                colorScale = presentStable.map(c => this.categoricalColorMap.get(c) || '#000000');
                (choroplethOptions as any)._stableUniqueCategories = classBreaks;
                (choroplethOptions as any)._stableUniqueColors = colorScale;

                if (this.categoricalColorMap.size > 7) {
                    this.messages.tooManyUniqueValues();
                }
            } catch (e) {
                console.error('[choropleth] categorical mapping error (proceeding without stability)', e);
                this.categoricalColorMap.clear();
                this.categoricalStableOrder = [];
            }
        } else if (this.lastClassificationMethod === ClassificationMethods.Unique) {
            this.categoricalColorMap.clear();
            this.categoricalStableOrder = [];
        }

        // Single-value numeric collapse: if non-categorical and only one distinct numeric value, force one color & two identical breaks
        if (choroplethOptions.classificationMethod !== ClassificationMethods.Unique) {
            try {
                const numericValues = colorValues.filter(v => typeof v === 'number' && !Number.isNaN(v));
                const uniqueNums = Array.from(new Set(numericValues));
                if (uniqueNums.length === 1) {
                    const v = uniqueNums[0];
                    const firstColor = Array.isArray(colorScale) ? colorScale[0] : (colorScale as any)[0];
                    classBreaks = [v, v]; // ensures legend creates exactly one range entry (v - v)
                    colorScale = [firstColor];
                }
            } catch (e) { console.warn('[choropleth] single-value collapse failed (non-fatal)', e); }
        }

        this.lastClassificationMethod = choroplethOptions.classificationMethod;
        this.lastMeasureQueryName = colorMeasure?.source?.queryName;

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
        validPCodes: string[],
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
                    // Prefer manifest-based direct TopoJSON path from the catalog
                    const resolvedUrl = GeoBoundariesCatalogService.resolveTopoJsonUrlSync(
                        choroplethOptions.geoBoundariesReleaseType,
                        choroplethOptions.geoBoundariesCountry,
                        choroplethOptions.geoBoundariesAdminLevel
                    ) || await GeoBoundariesCatalogService.resolveTopoJsonUrl(
                        choroplethOptions.geoBoundariesReleaseType,
                        choroplethOptions.geoBoundariesCountry,
                        choroplethOptions.geoBoundariesAdminLevel
                    );

                    if (resolvedUrl) {
                        serviceUrl = resolvedUrl;
                        const boundaryFieldName = GeoBoundariesService.getBoundaryFieldName(choroplethOptions);
                        pcodeKey = boundaryFieldName;
                        cacheKey = `geoboundaries_${choroplethOptions.geoBoundariesReleaseType}_${choroplethOptions.geoBoundariesCountry}_${choroplethOptions.geoBoundariesAdminLevel}`;
                        console.log(`Loading ${choroplethOptions.geoBoundariesCountry} ${choroplethOptions.geoBoundariesAdminLevel} (${choroplethOptions.geoBoundariesReleaseType}) via manifest`);
                    } else {
                        // Safe fallback to the legacy API metadata approach if manifest resolution fails
                        const metadata = await GeoBoundariesService.fetchMetadata(choroplethOptions);
                        if (!metadata || !metadata.data) {
                            this.host.displayWarningIcon("GeoBoundaries API Error", "maplumiWarning: Failed to resolve boundary URL from manifest or fetch metadata from API. Please check your settings.");
                            return;
                        }
                        serviceUrl = GeoBoundariesService.getDownloadUrl(metadata.data, true);
                        const boundaryFieldName = GeoBoundariesService.getBoundaryFieldName(choroplethOptions);
                        pcodeKey = boundaryFieldName;
                        cacheKey = `geoboundaries_${choroplethOptions.geoBoundariesReleaseType}_${choroplethOptions.geoBoundariesCountry}_${choroplethOptions.geoBoundariesAdminLevel}`;
                        console.log(`Loading ${GeoBoundariesService.getDataDescription(metadata.data)} (API fallback)`);
                    }
                }
            } catch (error) {
                this.host.displayWarningIcon("GeoBoundaries API Error", "maplumiWarning: Error connecting to GeoBoundaries API. Please check your network connection.");
                return;
            }
        } else {
            serviceUrl = choroplethOptions.topoJSON_geoJSON_FileUrl as any;
            // Cache by resource URL (not by location field) so different URLs don't collide
            // Normalize cache key by stripping helper query params we add (e.g., ml_source)
            cacheKey = `custom_${encodeURIComponent(requestHelpers.stripQueryParams(serviceUrl || ''))}`;
            // Open redirect guard for custom URLs
            if (requestHelpers.hasOpenRedirect(serviceUrl)) {
                this.host.displayWarningIcon(
                    "Unsafe URL detected",
                    "maplumiWarning: The provided boundary URL contains an open redirect parameter and was blocked."
                );
                return;
            }
        }

        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();

            try {
                console.log('[choropleth] about to call cacheService.getOrFetch', { serviceUrl, cacheKey });
                const data = await this.cacheService.getOrFetch(cacheKey, async () => {
                // Append a client identifier to outbound request URL
                    const fetchUrl = requestHelpers.appendClientIdQuery(serviceUrl);
                    console.log('[choropleth] fetchFn prepared fetchUrl=', fetchUrl);
                    if (!requestHelpers.isValidURL(fetchUrl)) { this.messages.invalidGeoTopoUrl(); console.warn('[choropleth] invalid fetch url', fetchUrl); return null; }
                    if (!requestHelpers.enforceHttps(fetchUrl)) { this.messages.geoTopoFetchNetworkError(); console.warn('[choropleth] non-https fetch blocked', fetchUrl); return null; }
                    let response: Response;
                    try {
                        response = await requestHelpers.fetchWithTimeout(fetchUrl, VisualConfig.NETWORK.FETCH_TIMEOUT_MS);
                    } catch (e) {
                        this.messages.geoTopoFetchNetworkError(); console.error('[choropleth] fetchWithTimeout error', e); return null;
                    }
                    if (!response.ok) {
                        this.messages.geoTopoFetchStatusError(response.status); console.error('[choropleth] topo fetch status', response.status, response.statusText); return null;
                    }
                    const json = await response.json();
                    if (!(await requestHelpers.isValidJsonResponse(json))) { this.messages.invalidGeoTopoData(); console.error('[choropleth] invalid json response from topo url'); return null; }
                    console.log('[choropleth] fetchFn fetched json, size=', json && (json.objects ? Object.keys(json.objects).length : (json.features ? json.features.length : 'unknown')));
                    return { data: json, response };
            }, { respectCacheHeaders: true });

                console.log('[choropleth] cacheService.getOrFetch returned', !!data);
                if (!data || !choroplethOptions.layerControl) {
                    console.warn('[choropleth] No data returned or layerControl disabled', { data: !!data, layerControl: choroplethOptions.layerControl });
                    // Surface a warning so users can see something happened
                    try { this.host.displayWarningIcon('GeoBoundaries', 'maplumiWarning: No boundary data was returned for the selected dataset.'); } catch {}
                    return;
                }

            let processedGeoData;
            try {
                console.debug('[choropleth] fetchAndRender serviceUrl=', serviceUrl, 'cacheKey=', cacheKey, 'pcodeKey=', pcodeKey, 'validPCodes=', validPCodes.length);
                const preferFirstLayer = true; // prefer first layer by default for all sources
                const honorPreferredName = choroplethOptions.boundaryDataSource === 'custom' && !!choroplethOptions.topojsonObjectName;
                const procResult = dataService.processGeoData(
                    data,
                    pcodeKey,
                    // Use validated, non-empty PCodes only
                    validPCodes,
                    choroplethOptions.topojsonObjectName,
                    preferFirstLayer,
                    honorPreferredName
                );
                // Decide whether to adopt the auto-detected key based on confidence thresholds
                const bestKey = procResult.usedPcodeKey;
                const bestCount = procResult.bestCount || 0;
                const originalCount = procResult.originalCount || 0;
                // Base thresholds
                const baseMinMatches = VisualConfig.AUTO_DETECT?.PCODE_MIN_MATCHES ?? 3;
                const baseMinMargin = VisualConfig.AUTO_DETECT?.PCODE_MIN_MARGIN ?? 2;
                // Dynamically adapt thresholds for small filtered datasets so we don't reject valid small selections
                const dynamicMinMatches = Math.max(1, Math.min(baseMinMatches, validPCodes.length));
                const dynamicMinMargin = Math.min(baseMinMargin, Math.max(1, validPCodes.length - 1));

                let chosenGeojson = procResult.filteredByOriginal;
                let chosenKey = pcodeKey;

                if (bestKey && bestKey !== pcodeKey) {
                    const thresholdsMet = bestCount >= dynamicMinMatches && (bestCount >= originalCount + dynamicMinMargin);
                    const originalEmptyBestNonZero = originalCount === 0 && bestCount > 0; // Fallback: avoid zero-feature result
                    if (thresholdsMet || originalEmptyBestNonZero) {
                        chosenGeojson = procResult.filteredByBest;
                        chosenKey = bestKey;
                        console.log('[choropleth] auto-swapping pcodeKey', { original: pcodeKey, chosen: bestKey, bestCount, originalCount, dynamicMinMatches, dynamicMinMargin, originalEmptyBestNonZero });
                        try { this.messages.autoSelectedBoundaryField(pcodeKey, bestKey, bestCount); } catch (e) {}
                    } else {
                        console.log('[choropleth] NOT swapping pcodeKey - thresholds not met', { original: pcodeKey, bestKey, bestCount, originalCount, dynamicMinMatches, dynamicMinMargin });
                    }
                }

                processedGeoData = chosenGeojson;
                pcodeKey = chosenKey;
            } catch (e: any) {
                console.error('[choropleth] processGeoData threw', e);
                try { this.host.displayWarningIcon(
                    "Invalid Geo/TopoJSON Data",
                    "maplumiWarning: The boundary data isn't valid GeoJSON (FeatureCollection with features). Please verify the URL, selected object name, and file format."
                ); } catch {}
                return;
            }

            try { console.log('[choropleth] processedGeoData features=', processedGeoData?.features?.length); } catch {}

            // Defensive: if the processed GeoJSON has no features, bail early and
            // avoid adding an empty vector layer which can lead to confusing UI states.
            if (!processedGeoData || !Array.isArray((processedGeoData as any).features) || (processedGeoData as any).features.length === 0) {
                console.warn('[choropleth] no features after processing - skipping layer creation');
                try { this.host.displayWarningIcon('No boundary features', 'maplumiWarning: The selected boundary dataset produced zero matching features. Please check your Boundary ID field and data.'); } catch {}
                // Remove any previously-added choropleth layer so we don't leave a stale layer
                if (this.choroplethLayer) {
                    try { (this.choroplethLayer as any).dispose?.(); } catch {}
                    try { this.map.removeLayer(this.choroplethLayer); } catch {}
                    this.choroplethLayer = undefined;
                }
                // Give the caller a chance to update overlay visibility
                return;
            }

            const layerOptions: ChoroplethLayerOptions = this.choroplethOptsBuilder.build({
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
            try { (this.choroplethLayer as any).dispose?.(); } catch {}
            this.map.removeLayer(this.choroplethLayer);
        }
        // Use WebGL vector layer for choropleth when engine is 'webgl' and geojson is valid
        const hasValidGeoJSON = !!(layerOptions as any)?.geojson && !!(layerOptions as any)?.geojson?.type;
        this.choroplethLayer = mapToolsOptions.renderEngine === 'webgl'
            ? (hasValidGeoJSON ? new ChoroplethWebGLLayer(layerOptions) : new ChoroplethCanvasLayer(layerOptions))
            : mapToolsOptions.renderEngine === 'canvas'
                ? new ChoroplethCanvasLayer(layerOptions)
                : new ChoroplethLayer(layerOptions);
    this.map.addLayer(this.choroplethLayer);
    try { (this.choroplethLayer as any).attachHitLayer?.(this.map); } catch {}
        if (mapToolsOptions.lockMapExtent === false) {
            const anyLayer: any = this.choroplethLayer as any;
            const extent = anyLayer?.getFeaturesExtent?.();
            if (extent) this.map.getView().fit(extent, VisualConfig.MAP.FIT_OPTIONS);
        }
    }
}
