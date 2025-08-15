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
import { parseCircleCategorical } from "../data/circle";
import { calculateCircleScale, applyScaling, findClosestValue } from "../math/circles";
import { MessageService } from "../services/MessageService";
import { CircleLayerOptionsBuilder } from "../services/LayerOptionBuilders";
import { BaseOrchestrator } from "./BaseOrchestrator";

export class CircleOrchestrator extends BaseOrchestrator {
    private circleOptsBuilder: CircleLayerOptionsBuilder;

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
    super(args);
    this.messages = new MessageService(this.host);
        this.circleOptsBuilder = new CircleLayerOptionsBuilder({
            svg: this.svg,
            svgContainer: this.svgContainer,
            selectionManager: this.selectionManager,
            tooltipServiceWrapper: this.tooltipServiceWrapper,
        });
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

        const parsed = parseCircleCategorical(categorical);
        if (!parsed.hasLon || !parsed.hasLat) {
            this.messages.missingLonLat();
            return undefined;
        }
        const { longitudes, latitudes, circleSizeValuesObjects } = parsed;
        if (!longitudes || !latitudes) return undefined;

        const combinedCircleSizeValues = this.combineCircleSizeValues(circleSizeValuesObjects, circleOptions);
    const { minCircleSizeValue, maxCircleSizeValue, circleScale, selectedScalingMethod } = calculateCircleScale(
            combinedCircleSizeValues,
            circleOptions
        );

        const dataPoints = this.createCircleDataPoints(longitudes, latitudes, circleSizeValuesObjects, categorical, dataService);

        if (longitudes.length !== latitudes.length) {
            this.messages.lonLatLengthMismatch();
            return undefined;
        }

        const layerOptions: CircleLayerOptions = this.circleOptsBuilder.build({
            longitudes,
            latitudes,
            circleOptions,
            combinedCircleSizeValues,
            minCircleSizeValue,
            maxCircleSizeValue,
            circleScale,
            dataPoints,
            circle1SizeValues: circleSizeValuesObjects[0]?.values as number[],
            circle2SizeValues: circleSizeValuesObjects[1]?.values as number[],
        });

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

    // parsing moved to src/data/circle.ts

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

    // scaling moved to src/math/circles.ts

    // applyScaling moved to src/math/circles.ts

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

    // Options construction moved to LayerOptionBuilders

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
            maxMapCircleRadius = applyScaling(actualMaxValue, minCircleSizeValue, maxCircleSizeValue, circleScale, circleOptions, validDataValues);
            maxLegendValue = actualMaxValue;
        } else {
            maxMapCircleRadius = applyScaling(mapScalingMaxValue, minCircleSizeValue, maxCircleSizeValue, circleScale, circleOptions, validDataValues);
            maxLegendValue = mapScalingMaxValue;
        }

    const largeLegendRadius = maxMapCircleRadius;
    const mediumLegendRadius = maxMapCircleRadius * 0.5;
    const smallLegendRadius = maxMapCircleRadius * 0.25;

        const minRadiusSquared = circleOptions.minRadius * circleOptions.minRadius;
        const largeValue = maxLegendValue;
        const mediumValue = ((mediumLegendRadius * mediumLegendRadius - minRadiusSquared) / circleScale) + minCircleSizeValue;
        const clampedMediumValue = Math.max(mapScalingMinValue, Math.min(mediumValue, mapScalingMaxValue));
    const closestMediumValue = findClosestValue(sortedValues, clampedMediumValue);
        const smallValue = ((smallLegendRadius * smallLegendRadius - minRadiusSquared) / circleScale) + minCircleSizeValue;
        const clampedSmallValue = Math.max(mapScalingMinValue, Math.min(smallValue, mapScalingMaxValue));
    const closestSmallValue = findClosestValue(sortedValues, clampedSmallValue);

        const finalValues = [closestSmallValue, closestMediumValue, largeValue];
        const finalRadii = finalValues.map(value =>
            applyScaling(value, minCircleSizeValue, maxCircleSizeValue, circleScale, circleOptions, validDataValues)
        );

        this.legendService.createProportionalCircleLegend(
            finalValues,
            finalRadii,
            numberofCircleCategories,
            circleOptions
        );

        this.legendService.showLegend("circle");
    }

    // findClosestValue moved to src/math/circles.ts
}
