import { FeatureCollection } from "geojson";
import * as turf from "@turf/turf";
import * as ss from "simple-statistics";
import * as chroma from "chroma-js";
import * as topojson from 'topojson-client';
import { ColorRampService } from "./ColorRampService";
import { ChoroplethOptions } from "../types/index";
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

export class DataService {

    private colorRampService: ColorRampService;

    constructor(colorRampService: any) {
        this.colorRampService = colorRampService;
    }

    public processGeoData(data: any, pcodeKey: string, validPCodes: string[]): FeatureCollection {
        // Handle topojson if needed
        let geojson: FeatureCollection = this.isTopoJSON(data)
            ? this.convertTopoJSONToGeoJSON(data)
            : data as FeatureCollection;

        // Simplify geometry
        const turfOptions = { tolerance: 0.01, highQuality: false };
        const simplifiedGeo = turf.simplify(geojson, turfOptions);

        // Filter features based on valid PCodes
        return {
            ...simplifiedGeo,
            features: simplifiedGeo.features.filter(feature =>
                validPCodes.includes(feature.properties[pcodeKey])
            )
        };
    }

    public extractTooltips(categorical: any): VisualTooltipDataItem[][] {
        // Assuming tooltip fields are in the 'values' collection
        const tooltipFields = categorical.values.filter(v => v.source.roles["Tooltips"]);
        const tooltips: VisualTooltipDataItem[][] = [];

        for (let i = 0; i < categorical.categories[0].values.length; i++) {
            const tooltipItems: VisualTooltipDataItem[] = tooltipFields.map(field => ({
                displayName: field.source.displayName,
                value: field.values[i]
            }));
            tooltips.push(tooltipItems);
        }

        return tooltips;
    }

    public getClassBreaks(values: number[], options: any): number[] {

        const uniqueValues = new Set(values);
        const numValues = uniqueValues.size;

        if (!options.classifyData) {
            return Array.from(uniqueValues).sort((a, b) => a - b);
        }

        const adjustedClasses = Math.min(options.classes, numValues);

        if (numValues <= 2) {
            return Array.from(uniqueValues).sort((a, b) => a - b);
        }

        switch (options.classificationMethod) {
            case "j":
                return ss.jenks(values, adjustedClasses);
            case "k":
                const clusters = ss.ckmeans(values, adjustedClasses);
                const maxValues = clusters.map(cluster => Math.max(...cluster));
                return [Math.min(...values), ...maxValues.sort((a, b) => a - b)];
            default:
                return chroma.limits(
                    values,
                    options.classificationMethod as "q" | "e" | "l",
                    adjustedClasses
                );
        }
    }

    public getColorScale(classBreaks: number[], options: ChoroplethOptions): string[] {

        if (options.usePredefinedColorRamp) {

            if (options.invertColorRamp) {
                this.colorRampService.invertRamp();
            }
            return this.colorRampService.generateColorRamp(
                classBreaks,
                options.classes
            );
        }

        return chroma
            .scale([options.minColor, options.midColor, options.maxColor])
            .mode(options.colorMode)
            .domain(classBreaks)
            .colors(options.classes);
    }

    public getColorFromClassBreaks(
        value: number,
        classBreaks: number[],
        colorScale: string[]
    ): string {
        if (value < classBreaks[0]) return colorScale[0];
        if (value > classBreaks[classBreaks.length - 1]) {
            return colorScale[colorScale.length - 1];
        }

        for (let i = 0; i < classBreaks.length - 1; i++) {
            if (value >= classBreaks[i] && value <= classBreaks[i + 1]) {
                return colorScale[i];
            }
        }

        return "#009edb"; // Default color
    }

    private isTopoJSON(data: any): boolean {
        return data.type === "Topology" && data.objects && Array.isArray(data.arcs);
    }
    
    private convertTopoJSONToGeoJSON(topology: any): FeatureCollection {

        if (!topology || typeof topology !== "object") {
            throw new Error("Invalid TopoJSON object provided.");
        }

        if (!topology.objects || typeof topology.objects !== "object") {
            throw new Error("Invalid or missing 'objects' property in TopoJSON.");
        }

        const layerNames = Object.keys(topology.objects);

        if (layerNames.length !== 1) {
            throw new Error(
                `Expected a single layer in TopoJSON, but found ${layerNames.length}.`
            );
        }

        const layerName = layerNames[0]; // Extract the name of the single layer
        return topojson.feature(topology, topology.objects[layerName]);
    }

} 