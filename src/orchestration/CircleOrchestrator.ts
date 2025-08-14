"use strict";

import powerbi from "powerbi-visuals-api";
import * as d3 from "d3";
import Map from "ol/Map";
import { VisualConfig } from "../config/VisualConfig";
import { ChoroplethDataService } from "../services/ChoroplethDataService";
import { LegendService } from "../services/LegendService";
import { CircleLayer } from "../layers/circleLayer";
import { CircleData, CircleLayerOptions, CircleOptions, MapToolsOptions } from "../types";
import { ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.extensibility.ISelectionId;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

export class CircleOrchestrator {
    private svg: d3.Selection<SVGElement, unknown, HTMLElement, any>;
    private svgOverlay: SVGSVGElement;
    private svgContainer: HTMLElement;
    private legendService: LegendService;
    private host: IVisualHost;
    private map: Map;
    private selectionManager: ISelectionManager;
    private tooltipServiceWrapper: ITooltipServiceWrapper;

    private circleLayer: CircleLayer | undefined;

    constructor(args: {
        svg: d3.Selection<SVGElement, unknown, HTMLElement, any>;
        svgOverlay: SVGSVGElement;
        svgContainer: HTMLElement;
        legendService: LegendService;
        host: IVisualHost;
        map: Map;
        selectionManager: ISelectionManager;
        tooltipServiceWrapper: ITooltipServiceWrapper;
    }) {
        this.svg = args.svg;
        this.svgOverlay = args.svgOverlay;
        this.svgContainer = args.svgContainer;
        this.legendService = args.legendService;
        this.host = args.host;
        this.map = args.map;
        this.selectionManager = args.selectionManager;
        this.tooltipServiceWrapper = args.tooltipServiceWrapper;
    }

    public getLayer(): CircleLayer | undefined {
        return this.circleLayer;
    }

    public setSelectedIds(selectionIds: ISelectionId[]) {
        if (this.circleLayer) this.circleLayer.setSelectedIds(selectionIds);
    }

    public render(
        categorical: any,
        circleOptions: CircleOptions,
        dataService: ChoroplethDataService,
        mapToolsOptions: MapToolsOptions,
        choroplethDisplayed: boolean
    ): CircleLayer | undefined {
        if (circleOptions.layerControl == false) {
            const group1 = this.svg.select(`#circles-group-1`);
            const group2 = this.svg.select(`#circles-group-2`);
            group1.selectAll("*").remove();
            group2.selectAll("*").remove();
            if (this.circleLayer) {
                this.map.removeLayer(this.circleLayer);
                this.circleLayer = undefined;
            }
            this.legendService.hideLegend("circle");
            return undefined;
        }

        const group1 = this.svg.select(`#circles-group-1`);
        const group2 = this.svg.select(`#circles-group-2`);
        group1.selectAll("*").remove();
        group2.selectAll("*").remove();

        this.legendService.getCircleLegendContainer()?.setAttribute("style", "display:flex");
        this.svgOverlay.style.display = "block";

        const { longitudes, latitudes, circleSizeValuesObjects } = this.extractCircleData(categorical, dataService);
        if (!longitudes || !latitudes) return undefined;

        const combinedCircleSizeValues = this.combineCircleSizeValues(circleSizeValuesObjects, circleOptions);
        const { minCircleSizeValue, maxCircleSizeValue, circleScale, selectedScalingMethod } = this.calculateCircleScale(
            combinedCircleSizeValues,
            circleOptions
        );

        const dataPoints = this.createCircleDataPoints(longitudes, latitudes, circleSizeValuesObjects, categorical, dataService);

        if (longitudes.length !== latitudes.length) {
            this.host.displayWarningIcon(
                "Longitude and Latitude have different lengths.",
                "maplumiWarning: Longitude and Latitude have different lengths. Please ensure that both fields are populated with the same number of values."
            );
            return undefined;
        }

        const layerOptions: CircleLayerOptions = this.createCircleLayerOptions(
            longitudes,
            latitudes,
            circleOptions,
            combinedCircleSizeValues,
            minCircleSizeValue,
            maxCircleSizeValue,
            circleScale,
            dataPoints,
            circleSizeValuesObjects[0]?.values as number[],
            circleSizeValuesObjects[1]?.values as number[]
        );

        this.renderCircleLayerOnMap(layerOptions, mapToolsOptions, choroplethDisplayed);

        if (circleOptions.showLegend) {
            this.renderCircleLegend(
                combinedCircleSizeValues,
                circleSizeValuesObjects.length,
                minCircleSizeValue,
                maxCircleSizeValue,
                circleScale,
                selectedScalingMethod,
                circleOptions
            );
        } else {
            this.legendService.hideLegend("circle");
        }

        return this.circleLayer;
    }

    private extractCircleData(categorical: any, dataService: ChoroplethDataService): CircleData {
        const lonCategory = categorical?.categories?.find((c: any) => c.source?.roles?.Longitude);
        const latCategory = categorical?.categories?.find((c: any) => c.source?.roles?.Latitude);

        if (!lonCategory || !latCategory) {
            this.host.displayWarningIcon(
                "Missing Longitude or Latitude roles",
                "maplumiWarning: Both Longitude and Latitude roles must be assigned to view scaled cirles. Please check your data fields."
            );
            return { longitudes: undefined, latitudes: undefined, circleSizeValuesObjects: [] };
        }

        const circleSizeValuesObjects = categorical?.values?.filter((c: any) => c.source?.roles?.Size) || [];
        return {
            longitudes: lonCategory.values as number[],
            latitudes: latCategory.values as number[],
            circleSizeValuesObjects,
        };
    }

    private combineCircleSizeValues(circleSizeValuesObjects: any[], circleOptions: CircleOptions): number[] {
        const individual = [
            ...(circleSizeValuesObjects[0]?.values || []),
            ...(circleSizeValuesObjects[1]?.values || []),
        ].map(Number);

        if (circleOptions.chartType === 'donut-chart' || circleOptions.chartType === 'pie-chart') {
            const values1 = circleSizeValuesObjects[0]?.values || [];
            const values2 = circleSizeValuesObjects[1]?.values || [];
            const minLength = Math.min(values1.length, values2.length);
            for (let i = 0; i < minLength; i++) {
                if (values1[i] !== undefined && values2[i] !== undefined) {
                    individual.push(Number(values1[i]) + Number(values2[i]));
                }
            }
        }

        return individual;
    }

    private calculateCircleScale(
        combinedCircleSizeValues: number[],
        circleOptions: CircleOptions
    ): { minCircleSizeValue: number; maxCircleSizeValue: number; circleScale: number; selectedScalingMethod: string } {
        const validValues = combinedCircleSizeValues.filter(v => !isNaN(v) && isFinite(v));
        if (validValues.length === 0) {
            return { minCircleSizeValue: 0, maxCircleSizeValue: 0, circleScale: 1, selectedScalingMethod: 'square-root' };
        }

        const sortedValues = [...validValues].sort((a, b) => a - b);
        const n = sortedValues.length;
        const percentile5 = sortedValues[Math.floor(n * 0.05)];
        const percentile95 = sortedValues[Math.floor(n * 0.95)];
        const actualMin = Math.min(...validValues);
        const actualMax = Math.max(...validValues);

        const percentileRange = percentile95 - percentile5;
        const outlierGap = actualMax - percentile95;
        const outlierGapRatio = percentileRange > 0 ? outlierGap / percentileRange : 0;

        let minCircleSizeValue: number;
        let maxCircleSizeValue: number;
        if (outlierGapRatio > 0.2 && percentileRange > 0.001) {
            minCircleSizeValue = percentile5;
            maxCircleSizeValue = percentile95;
        } else {
            minCircleSizeValue = percentile95 - percentile5 < 0.001 ? actualMin : percentile5;
            maxCircleSizeValue = percentile95 - percentile5 < 0.001 ? actualMax : percentile95;
        }

        let selectedScalingMethod = 'square-root';

        let circleScale: number;
        const minRadiusSquared = circleOptions.minRadius * circleOptions.minRadius;
        const maxRadiusSquared = circleOptions.maxRadius * circleOptions.maxRadius;
        if (maxCircleSizeValue === minCircleSizeValue) {
            circleScale = 1;
        } else {
            const isAdaptive = outlierGapRatio > 0.2 && percentileRange > 0.001;
            if (isAdaptive) {
                const p95AreaFraction = 0.8;
                const effectiveMaxRadiusSquared = minRadiusSquared + (maxRadiusSquared - minRadiusSquared) * p95AreaFraction;
                circleScale = (effectiveMaxRadiusSquared - minRadiusSquared) / (maxCircleSizeValue - minCircleSizeValue);
            } else {
                circleScale = (maxRadiusSquared - minRadiusSquared) / (maxCircleSizeValue - minCircleSizeValue);
            }
        }

        return { minCircleSizeValue, maxCircleSizeValue, circleScale, selectedScalingMethod };
    }

    private applyScaling(value: number, minValue: number, maxValue: number, scaleFactor: number, circleOptions: CircleOptions, allDataValues?: number[]): number {
        if (value > maxValue && allDataValues && allDataValues.length > 0) {
            const actualMax = Math.max(...allDataValues);
            if (actualMax > maxValue) {
                const outlierRange = actualMax - maxValue;
                if (outlierRange > 0) {
                    const outlierPosition = Math.min((value - maxValue) / outlierRange, 1);
                    const minRadiusSquared = circleOptions.minRadius * circleOptions.minRadius;
                    const p95Radius = Math.sqrt(minRadiusSquared + (maxValue - minValue) * scaleFactor);
                    const remainingRadiusSpace = circleOptions.maxRadius - p95Radius;
                    const maxOutlierBonus = remainingRadiusSpace * 0.8;
                    const outlierRadiusBonus = maxOutlierBonus * outlierPosition;
                    const finalRadius = Math.min(p95Radius + outlierRadiusBonus, circleOptions.maxRadius);
                    return finalRadius;
                }
            }
        }
        const clampedValue = Math.max(minValue, Math.min(value, maxValue));
        const minRadiusSquared = circleOptions.minRadius * circleOptions.minRadius;
        const scaledAreaSquared = minRadiusSquared + (clampedValue - minValue) * scaleFactor;
        return Math.sqrt(scaledAreaSquared);
    }

    private createCircleDataPoints(
        longitudes: number[],
        latitudes: number[],
        circleSizeValuesObjects: any[],
        categorical: any,
        dataService: ChoroplethDataService
    ): any[] {
        const tooltips = dataService.extractTooltips(categorical);
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
        maxCircleSizeValue: number,
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
            maxCircleSizeValue,
            circleScale,
            svg: this.svg,
            svgContainer: this.svgContainer,
            zIndex: 5,
            dataPoints,
            tooltipServiceWrapper: this.tooltipServiceWrapper,
            selectionManager: this.selectionManager,
        };
    }

    private renderCircleLayerOnMap(circleLayerOptions: CircleLayerOptions, mapToolsOptions: MapToolsOptions, choroplethDisplayed: boolean): void {
        if (this.circleLayer) {
            this.map.removeLayer(this.circleLayer);
        }
        this.circleLayer = new CircleLayer(circleLayerOptions);
        this.map.addLayer(this.circleLayer);

        if (choroplethDisplayed === false && mapToolsOptions.lockMapExtent === false) {
            const extent = this.circleLayer.getFeaturesExtent();
            if (extent) {
                this.map.getView().fit(extent, VisualConfig.MAP.FIT_OPTIONS);
            }
        }
    }

    private renderCircleLegend(
        combinedCircleSizeValues: number[],
        numberofCircleCategories: number,
        minCircleSizeValue: number,
        maxCircleSizeValue: number,
        circleScale: number,
        selectedScalingMethod: string,
        circleOptions: CircleOptions
    ): void {
        const validDataValues = combinedCircleSizeValues.filter(v => !isNaN(v) && isFinite(v));
        if (validDataValues.length === 0) return;
        const sortedValues = [...validDataValues].sort((a, b) => a - b);
        const mapScalingMaxValue = maxCircleSizeValue;
        const mapScalingMinValue = minCircleSizeValue;
        const actualMaxValue = Math.max(...validDataValues);
        const n = sortedValues.length;
        const percentile95 = sortedValues[Math.floor(n * 0.95)];
        const isAdaptiveScaling = actualMaxValue > maxCircleSizeValue;

        let maxMapCircleRadius: number;
        let maxLegendValue: number;
        if (isAdaptiveScaling) {
            maxMapCircleRadius = this.applyScaling(actualMaxValue, minCircleSizeValue, maxCircleSizeValue, circleScale, circleOptions, validDataValues);
            maxLegendValue = actualMaxValue;
        } else {
            maxMapCircleRadius = this.applyScaling(mapScalingMaxValue, minCircleSizeValue, maxCircleSizeValue, circleScale, circleOptions, validDataValues);
            maxLegendValue = mapScalingMaxValue;
        }

        const largeLegendRadius = maxMapCircleRadius;
        const mediumLegendRadius = maxMapCircleRadius * 0.5;
        const smallLegendRadius = maxMapCircleRadius * 0.25;

        const minRadiusSquared = circleOptions.minRadius * circleOptions.minRadius;
        const largeValue = maxLegendValue;
        const mediumValue = ((mediumLegendRadius * mediumLegendRadius - minRadiusSquared) / circleScale) + minCircleSizeValue;
        const clampedMediumValue = Math.max(mapScalingMinValue, Math.min(mediumValue, mapScalingMaxValue));
        const closestMediumValue = this.findClosestValue(sortedValues, clampedMediumValue);
        const smallValue = ((smallLegendRadius * smallLegendRadius - minRadiusSquared) / circleScale) + minCircleSizeValue;
        const clampedSmallValue = Math.max(mapScalingMinValue, Math.min(smallValue, mapScalingMaxValue));
        const closestSmallValue = this.findClosestValue(sortedValues, clampedSmallValue);

        const finalValues = [closestSmallValue, closestMediumValue, largeValue];
        const finalRadii = finalValues.map(value =>
            this.applyScaling(value, minCircleSizeValue, maxCircleSizeValue, circleScale, circleOptions, validDataValues)
        );

        this.legendService.createProportionalCircleLegend(
            finalValues,
            finalRadii,
            numberofCircleCategories,
            circleOptions
        );

        this.legendService.showLegend("circle");
    }

    private findClosestValue(sortedValues: number[], targetValue: number): number {
        let closest = sortedValues[0];
        let minDiff = Math.abs(targetValue - closest);
        for (const value of sortedValues) {
            const diff = Math.abs(targetValue - value);
            if (diff < minDiff) {
                minDiff = diff;
                closest = value;
            }
        }
        return closest;
    }
}
