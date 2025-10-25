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
    private numericPlaceholderRange: { start: number; slots: number } | undefined;
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
                const choroplethLegendContainer = this.legendService.getChoroplethLegendContainer();
                if (choroplethLegendContainer) {
                    choroplethLegendContainer.style.display = "flex";
                }
                const formatString = colorMeasure?.source?.format;
                this.legendService.createChoroplethLegend(
                    colorValues,
                    classBreaks as any,
                    colorScale as any,
                    choroplethOptions,
                    undefined,
                    formatString,
                    this.host.locale
                );
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
                const allNumeric = currentUnique.every(v => typeof v === "number");
                const sortedCurrent = allNumeric
                    ? [...currentUnique].sort((a, b) => (a as number) - (b as number))
                    : [...currentUnique].sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: "base" }));

                const requestedClasses = choroplethOptions.classes && choroplethOptions.classes > 0
                    ? choroplethOptions.classes
                    : sortedCurrent.length;
                const maxLegendItems = Math.min(requestedClasses || sortedCurrent.length || 0, 7);
                const basePalette = this.ensurePaletteArray(colorScale, maxLegendItems);

                if (maxLegendItems === 0) {
                    this.clearUniqueState();
                } else if (allNumeric) {
                    this.applyNumericUniquePalette(sortedCurrent as number[], basePalette, maxLegendItems, enteringUnique || measureChanged);
                } else {
                    this.applyTextUniquePalette(sortedCurrent, basePalette, maxLegendItems, enteringUnique || measureChanged);
                }

                const presentStable = this.categoricalStableOrder.filter(c => currentUnique.includes(c));
                classBreaks = presentStable;
                colorScale = presentStable.map(c => this.categoricalColorMap.get(c) || "#000000");
                (choroplethOptions as any)._stableUniqueCategories = classBreaks;
                (choroplethOptions as any)._stableUniqueColors = colorScale;
            } catch (e) {
                
                this.categoricalColorMap.clear();
                this.categoricalStableOrder = [];
            }
        } else if (this.lastClassificationMethod === ClassificationMethods.Unique) {
            this.categoricalColorMap.clear();
            this.categoricalStableOrder = [];
            this.numericPlaceholderRange = undefined;
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
            } catch (e) { }
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
                const data = await this.cacheService.getOrFetch(cacheKey, async () => {
                // Append a client identifier to outbound request URL
                    const fetchUrl = requestHelpers.appendClientIdQuery(serviceUrl);
                    if (!requestHelpers.isValidURL(fetchUrl)) { this.messages.invalidGeoTopoUrl(); return null; }
                    if (!requestHelpers.enforceHttps(fetchUrl)) { this.messages.geoTopoFetchNetworkError(); return null; }
                    let response: Response;
                    try {
                        response = await requestHelpers.fetchWithTimeout(fetchUrl, VisualConfig.NETWORK.FETCH_TIMEOUT_MS);
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

                if (!data || !choroplethOptions.layerControl) {
                    // Surface a warning so users can see something happened
                    try { this.host.displayWarningIcon('GeoBoundaries', 'maplumiWarning: No boundary data was returned for the selected dataset.'); } catch {}
                    return;
                }

            let processedGeoData;
            try {
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
                        try { this.messages.autoSelectedBoundaryField(pcodeKey, bestKey, bestCount); } catch (e) {}
                    } else {
                    }
                }

                processedGeoData = chosenGeojson;
                pcodeKey = chosenKey;
            } catch (e: any) {
                try { this.host.displayWarningIcon(
                    "Invalid Geo/TopoJSON Data",
                    "maplumiWarning: The boundary data isn't valid GeoJSON (FeatureCollection with features). Please verify the URL, selected object name, and file format."
                ); } catch {}
                return;
            }


            // Defensive: if the processed GeoJSON has no features, bail early and
            // avoid adding an empty vector layer which can lead to confusing UI states.
            if (!processedGeoData || !Array.isArray((processedGeoData as any).features) || (processedGeoData as any).features.length === 0) {
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

    private ensurePaletteArray(colorScale: any, length: number): string[] {
        const source = Array.isArray(colorScale)
            ? (colorScale as string[])
            : Object.values(colorScale ?? {}) as string[];
        const result = source.slice(0, Math.max(length, 0));
        while (result.length < length) {
            result.push("#000000");
        }
        return result;
    }

    private clearUniqueState(): void {
        this.categoricalColorMap.clear();
        this.categoricalStableOrder = [];
        this.numericPlaceholderRange = undefined;
    }

    private applyNumericUniquePalette(
        values: number[],
        palette: string[],
        maxSlots: number,
        forceRebuild: boolean
    ): void {
        if (values.length === 0) {
            this.clearUniqueState();
            return;
        }

        const start = this.computeNumericRangeStart(values, maxSlots, forceRebuild);
        const needsRebuild = forceRebuild
            || !this.numericPlaceholderRange
            || this.numericPlaceholderRange.start !== start
            || this.numericPlaceholderRange.slots !== maxSlots;

        if (needsRebuild) {
            this.initializeNumericPlaceholderRange(start, maxSlots, palette);
        } else {
            this.applyPaletteToNumericRange(palette);
        }

        const range = this.numericPlaceholderRange!;
        values.forEach(value => {
            if (value >= range.start && value < range.start + range.slots) {
                const offset = value - range.start;
                this.categoricalColorMap.set(value, palette[offset] || "#000000");
            } else {
                this.categoricalColorMap.set(value, "#000000");
            }
        });
    }

    private computeNumericRangeStart(values: number[], maxSlots: number, forceRebuild: boolean): number {
        const newMin = values[0];
        const newMax = values[values.length - 1];

        if (maxSlots <= 0) {
            return newMin;
        }

        const previous = this.numericPlaceholderRange;
        if (!previous || forceRebuild) {
            return this.clampNumericRangeStart(newMin, newMax, maxSlots, newMin);
        }

        let desiredStart = previous.start;
        const previousEnd = previous.start + previous.slots - 1;

        if (previous.slots !== maxSlots) {
            desiredStart = previous.start;
        }

        if (newMin < previous.start) {
            desiredStart = newMin;
        } else if (newMax > previousEnd) {
            desiredStart = newMax - maxSlots + 1;
        }

        return this.clampNumericRangeStart(newMin, newMax, maxSlots, desiredStart);
    }

    private clampNumericRangeStart(newMin: number, newMax: number, maxSlots: number, desiredStart: number): number {
        if (maxSlots <= 0) {
            return newMin;
        }
        const minPossible = newMin;
        let maxPossible = newMax - maxSlots + 1;
        if (maxPossible < minPossible) {
            maxPossible = minPossible;
        }

        if (desiredStart < minPossible) {
            return minPossible;
        }
        if (desiredStart > maxPossible) {
            return maxPossible;
        }
        return desiredStart;
    }

    private initializeNumericPlaceholderRange(start: number, slots: number, palette: string[]): void {
        this.numericPlaceholderRange = { start, slots };
        this.categoricalColorMap.clear();
        this.categoricalStableOrder = [];
        for (let i = 0; i < slots; i++) {
            const value = start + i;
            this.categoricalStableOrder.push(value);
            this.categoricalColorMap.set(value, palette[i] || "#000000");
        }
    }

    private applyPaletteToNumericRange(palette: string[]): void {
        if (!this.numericPlaceholderRange) {
            return;
        }
        const { start, slots } = this.numericPlaceholderRange;
        this.categoricalColorMap.clear();
        this.categoricalStableOrder = [];
        for (let i = 0; i < slots; i++) {
            const value = start + i;
            this.categoricalStableOrder.push(value);
            this.categoricalColorMap.set(value, palette[i] || "#000000");
        }
    }

    private applyTextUniquePalette(
        sortedValues: any[],
        palette: string[],
        maxSlots: number,
        forceReset: boolean
    ): void {
        if (forceReset) {
            this.categoricalColorMap.clear();
            this.categoricalStableOrder = [];
        }

        this.numericPlaceholderRange = undefined;

        for (const value of sortedValues) {
            if (!this.categoricalStableOrder.includes(value) && this.categoricalStableOrder.length < maxSlots) {
                this.categoricalStableOrder.push(value);
            }
        }

        if (this.categoricalStableOrder.length > maxSlots) {
            this.categoricalStableOrder = this.categoricalStableOrder.slice(0, maxSlots);
        }

        this.categoricalStableOrder.forEach((value, index) => {
            this.categoricalColorMap.set(value, palette[index] || "#000000");
        });
    }
}
