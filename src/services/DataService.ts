import { FeatureCollection } from "geojson";
import * as turf from "@turf/turf";
import * as ss from "simple-statistics";
import * as chroma from "chroma-js";
//import { MapData } from "../types";

export class DataService {
    
    private colorRampGenerator: any; // Replace with proper type

    constructor(colorRampGenerator: any) {
        this.colorRampGenerator = colorRampGenerator;
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

    public getColorScale(classBreaks: number[], options: any): string[] {
        if (options.usePredefinedColorRamp) {
            if (options.invertColorRamp) {
                this.colorRampGenerator.invertRamp();
            }
            return this.colorRampGenerator.generateColorRamp(
                classBreaks,
                options.classes
            );
        }

        return chroma
            .scale([options.minColor, options.midColor, options.maxColor])
            .mode("lab")
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
        return data.type === "Topology" && data.objects;
    }

    private convertTopoJSONToGeoJSON(topology: any): FeatureCollection {
        // Implementation needed based on your topoJSON conversion logic
        return {} as FeatureCollection;
    }
} 