import { FeatureCollection } from "geojson";
import * as turf from "@turf/turf";
import * as ss from "simple-statistics";
import * as chroma from "chroma-js";
import * as topojson from 'topojson-client';
import { ColorRampService } from "./ColorRampService";
import { ChoroplethOptions } from "../types/index";
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

/**
 * Service class responsible for processing and transforming geographic and statistical data
 * for visualization on maps. Handles data classification, tooltip generation, and geometry processing.
 */

export class DataService {

    private colorRampService: ColorRampService;

    constructor(colorRampService: any) {
        this.colorRampService = colorRampService;
    }

    /**
     * Processes geographic data by converting TopoJSON to GeoJSON if needed, simplifying geometries,
     * and filtering features based on valid PCodes.
     * @param data Raw geographic data in either TopoJSON or GeoJSON format
     * @param pcodeKey The property key used to identify PCodes in the features
     * @param validPCodes Array of valid PCodes to filter features by
     * @returns Processed GeoJSON FeatureCollection with simplified and filtered features
     */
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

    /**
     * Extracts tooltip data from PowerBI categorical data format
     * @param categorical PowerBI categorical data containing values and categories
     * @returns Array of tooltip items arrays, where each inner array contains tooltip items for a feature
     */
    public extractTooltips(categorical: any): VisualTooltipDataItem[][] {
        
        // Get all fields that have the Tooltips role
        const tooltipFields = categorical.values
            .filter(v => v.source.roles["Tooltips"])
            // Sort by the original order in Power BI
            .sort((a, b) => {
                const aIndex = a.source.index || 0;
                const bIndex = b.source.index || 0;
                return aIndex - bIndex;
            });

        const tooltips: VisualTooltipDataItem[][] = [];

        for (let i = 0; i < categorical.categories[0].values.length; i++) {
            const tooltipItems: VisualTooltipDataItem[] = tooltipFields.map(field => {
                const value = field.values[i];
                const format = field.source.format;
                
                // Create tooltip item with original formatting
                const tooltipItem: VisualTooltipDataItem = {
                    displayName: field.source.displayName,
                    value: this.formatValue(value, format)
                };

                // Add color if specified in Power BI
                if (field.source.color) {
                    tooltipItem.color = field.source.color;
                }

                return tooltipItem;
            });
            tooltips.push(tooltipItems);
        }

        return tooltips;
    }

    /**
     * Formats a value according to Power BI formatting rules
     * @param value The value to format
     * @param format The Power BI format string
     * @returns Formatted string value
     */
    private formatValue(value: any, format?: string): string {
        if (value === null || value === undefined) {
            return '';
        }

        // If no format specified, use default conversion
        if (!format) {
            return this.convertToString(value);
        }

        // Handle Date objects with format
        if (value instanceof Date) {
            try {
                // Use Power BI's date format if available
                return value.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch {
                return value.toLocaleDateString();
            }
        }

        // Handle numbers with format
        if (typeof value === 'number') {
            try {
                // Use Power BI's number format if available
                return value.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                    useGrouping: true
                });
            } catch {
                return this.convertToString(value);
            }
        }

        // Handle arrays
        if (Array.isArray(value)) {
            return value.map(v => this.formatValue(v, format)).join(', ');
        }

        // Handle objects
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }

        // Default case: convert to string
        return String(value);
    }

    /**
     * Converts any value to a string representation (fallback method)
     * @param value The value to convert
     * @returns String representation of the value
     */
    private convertToString(value: any): string {
        if (value === null || value === undefined) {
            return '';
        }

        // Handle Date objects
        if (value instanceof Date) {
            return value.toLocaleDateString();
        }

        // Handle numbers
        if (typeof value === 'number') {
            // Check if it's an integer
            if (Number.isInteger(value)) {
                return value.toString();
            }
            // For floating point numbers, limit decimal places
            return value.toFixed(2);
        }

        // Handle arrays
        if (Array.isArray(value)) {
            return value.map(v => this.convertToString(v)).join(', ');
        }

        // Handle objects
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }

        // Default case: convert to string
        return String(value);
    }

    /**
     * Calculates class breaks for choropleth map data classification
     * @param values Array of numeric values to be classified
     * @param options Classification options object containing:
     *   - classifyData: boolean - Whether to classify the data or use unique values
     *   - classes: number - Number of desired classes/breaks
     *   - classificationMethod: string - Classification method to use:
     *     - "j": Jenks natural breaks
     *     - "k": K-means clustering
     *     - "q": Quantile
     *     - "e": Equal interval
     *     - "l": Linear
     * @returns Array of break points that define the class intervals
     */
    public getClassBreaks(values: number[], options: any): number[] {

        const uniqueValues = new Set(values);
        const numValues = uniqueValues.size;

        // Handle unclassified/unique values case first
        if (options.classificationMethod === "u") {
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

    /**
     * Generates a color scale based on class breaks and choropleth options
     * @param classBreaks Array of numeric break points that define class intervals
     * @param options Choropleth options object containing:
     *   - usePredefinedColorRamp: boolean - Whether to use predefined color ramp
     *   - invertColorRamp: boolean - Whether to invert the color ramp order
     *   - classes: number - Number of color classes to generate
     *   - minColor: string - Starting color for custom gradient
     *   - midColor: string - Middle color for custom gradient
     *   - maxColor: string - Ending color for custom gradient
     *   - colorMode: string - Color interpolation mode (e.g. 'lch', 'lab', 'rgb')
     * @returns Array of color strings representing the generated color scale
     */

    public getColorScale(classBreaks: number[], options: ChoroplethOptions): string[] {
        // For unclassified/unique values, use the number of unique values as classes
        const numClasses = options.classificationMethod === "u" 
            ? classBreaks.length 
            : options.classes;

        if (options.usePredefinedColorRamp) {
            if (options.invertColorRamp) {
                this.colorRampService.invertRamp();
            }
            return this.colorRampService.generateColorRamp(
                classBreaks,
                numClasses,
                options.colorMode
            );
        }

        return chroma
            .scale([options.minColor, options.midColor, options.maxColor])
            .mode(options.colorMode)
            .domain(classBreaks)
            .colors(numClasses);
    }


    /**
     * Gets the color from the color scale based on the value and class breaks
     * @param value The value to get the color for
     * @param classBreaks The class breaks to use for the color scale
     * @param colorScale The color scale to use for the color
     * @returns The color from the color scale
     */
    public getColorFromClassBreaks(
        value: number,
        classBreaks: number[],
        colorScale: string[],
        options?: ChoroplethOptions
    ): string {
        // For unclassified/unique values, find exact match
        if (options?.classificationMethod === "u") {
            const index = classBreaks.indexOf(value);
            return index !== -1 ? colorScale[index] : "#009edb"; // Default color if no match
        }

        // For classified values, use range-based logic
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


    /**
     * Checks if the provided data is in TopoJSON format
     * @param data Data to check format of
     * @returns boolean indicating if data is TopoJSON
     */
    private isTopoJSON(data: any): boolean {
        return data.type === "Topology" && data.objects && Array.isArray(data.arcs);
    }


    /**
     * Converts TopoJSON data to GeoJSON format
     * @param topology TopoJSON data to convert
     * @returns GeoJSON FeatureCollection
     */
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