import { ChoroplethOptions, CircleOptions } from "../types/index";
import * as format from "../utils/format";
import { ClassificationMethods, LegendOrientations, LegendLabelPositions } from "../constants/strings";
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";

export interface CircleMeasureLegendEntry {
    name: string;
    color: string;
    opacity?: number;
}

export class LegendService {

    private mainContainer: HTMLElement;
    private circleLegendContainer: HTMLElement | null = null;
    private choroplethLegendContainer: HTMLElement | null = null;

    constructor(container: HTMLElement) {
        this.mainContainer = container;
    }

    createProportionalCircleLegend(
        sizeValues: number[],
        radii: number[],
        numberofCircleCategories: number,
        circleOptions: CircleOptions,
        formatTemplate: string = "{:.0f}",
        customLabels?: string[],
        measureLegendEntries?: CircleMeasureLegendEntry[]
    ) {
        // Clear or create container
        if (!this.circleLegendContainer) {
            this.circleLegendContainer = document.createElement("div");
            this.mainContainer.appendChild(this.circleLegendContainer);
        } else {
            this.clearContainer(this.circleLegendContainer);
        }

    const containerPadding = 5;
    const rightSvgPadding = Math.max(circleOptions.xPadding ?? 0, 0);
    const bottomSvgPadding = Math.max(circleOptions.yPadding ?? 0, 0);

    // Configure container layout to grow with content
    this.circleLegendContainer.style.display = "flex";
        this.circleLegendContainer.style.flexDirection = "column";
    this.circleLegendContainer.style.alignItems = "flex-start";
        this.circleLegendContainer.style.overflow = "visible";
    this.circleLegendContainer.style.width = "auto";
    this.circleLegendContainer.style.maxWidth = "none";
    this.circleLegendContainer.style.minWidth = "0";
    this.circleLegendContainer.style.boxSizing = "border-box";
    this.circleLegendContainer.style.padding = `${containerPadding}px`;
    this.circleLegendContainer.style.justifyContent = "flex-start";

        // Create legend items container
        const circleLegendItemsContainer = document.createElement("div");
        circleLegendItemsContainer.style.display = "flex";
        circleLegendItemsContainer.style.flexDirection = "column";
    circleLegendItemsContainer.style.alignItems = "flex-start";
        circleLegendItemsContainer.style.height = "auto";
        circleLegendItemsContainer.style.overflow = "visible";
    circleLegendItemsContainer.style.width = "auto";
    circleLegendItemsContainer.style.maxWidth = "none";
    circleLegendItemsContainer.style.minWidth = "0";
    circleLegendItemsContainer.style.boxSizing = "border-box";
    circleLegendItemsContainer.style.alignSelf = "flex-start";
        this.circleLegendContainer.appendChild(circleLegendItemsContainer);

        // Add title
        const title = document.createElement("div");
        title.textContent = circleOptions.legendTitle;
        title.style.color = circleOptions.legendTitleColor;
        title.style.fontSize = "12px";
        title.style.fontWeight = "bold";
        title.style.marginBottom = "10px";
        circleLegendItemsContainer.appendChild(title);

        // Get legend data
        let legendData = this.getProportionalCircleLegendData(
            sizeValues,
            radii,
            circleOptions.minRadiusThreshold,
            circleOptions.roundOffLegendValues
        );
        if (!legendData || legendData.length === 0) return;

        // Optionally hide the minimum circle if value is below threshold, using CircleOptions
        if (circleOptions.hideMinIfBelowThreshold && legendData.length > 0 && legendData[0].size < circleOptions.minValueThreshold) {
            legendData = legendData.slice(1);
        }

        // Create SVG elements
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.style.overflow = "visible";
        svg.style.display = "block";
        svg.style.alignSelf = "flex-start";
        svg.style.margin = "0";
    const maxRadius = Math.max(...legendData.map((item) => item.radius));
    const bottomY = 2 * maxRadius; // Bottom Y position for circles
    let maxLabelWidth = 0;
    let maxCircleBottom = 0;
    let maxLabelBaseline = 0;
    const labelFontSize = 10;
    const minLabelGap = Math.max(circleOptions.minRadiusThreshold ?? 0, 6);
    let previousLabelY: number | undefined;

        // Create a shallow copy of legendData and sort it in descending order based on radius. thus, the largest circle will be drawn first
        const sortedLegendData = [...legendData].sort((a, b) => b.radius - a.radius);

        // If custom labels are provided, match them to the sorted data
        let sortedCustomLabels: string[] | undefined;
        if (customLabels && customLabels.length === legendData.length) {
            // Create a mapping from original legendData to customLabels
            const labelMap = new Map();
            legendData.forEach((item, index) => {
                labelMap.set(item, customLabels[index]);
            });
            // Apply the mapping to sorted data
            sortedCustomLabels = sortedLegendData.map(item => labelMap.get(item));
        }

        // Set SVG dimensions with consistent horizontal padding
    const newCenterX = maxRadius;
        const labelAnchorX = newCenterX + maxRadius + circleOptions.labelSpacing;


        // Clear SVG before re-adding elements (safe way)
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
        maxLabelWidth = 0;
        sortedLegendData.forEach((item, index) => {
            // Calculate the Y position so all circles are aligned at the bottom
            const currentY = bottomY - item.radius;
            const circleBottom = currentY + item.radius;
            maxCircleBottom = Math.max(maxCircleBottom, circleBottom);

            // Draw the circle
            const circle = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle"
            );
            circle.setAttribute("cx", newCenterX.toString());
            circle.setAttribute("cy", currentY.toString());
            circle.setAttribute("r", item.radius.toString());
            circle.setAttribute("stroke-width", circleOptions.legendItemStrokeWidth.toString());

            // Remove fill if circleValues are more than one
            if (numberofCircleCategories === 1) {

                circle.setAttribute("stroke", circleOptions.legendItemStrokeColor);
                circle.setAttribute("fill", circleOptions.color1);
                circle.setAttribute("fill-opacity", circleOptions.layer1Opacity.toString());

            } else {

                circle.setAttribute("stroke", circleOptions.leaderLineColor);
                circle.setAttribute("fill", "none"); // Remove fill
            }


            svg.appendChild(circle);

            // Calculate label position
            const labelX = labelAnchorX;
            const labelStartY = currentY - item.radius;
            let labelY = labelStartY;

            if (previousLabelY !== undefined) {
                const gap = labelY - previousLabelY;
                if (gap < minLabelGap) {
                    labelY = previousLabelY + minLabelGap;
                }
            }
            previousLabelY = labelY;
            maxLabelBaseline = Math.max(maxLabelBaseline, labelY + labelFontSize);

            // Add the leader line
            const line = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "line"
            );
            line.setAttribute("x1", newCenterX.toString());
            line.setAttribute("y1", labelStartY.toString());
            line.setAttribute("x2", (labelX - 3).toString());
            line.setAttribute("y2", labelY.toString());
            line.setAttribute("stroke", circleOptions.leaderLineColor);
            line.setAttribute("stroke-width", circleOptions.leaderLineStrokeWidth.toString());

            svg.appendChild(line);

            // Use custom label if provided, otherwise format the value
            const labelText = sortedCustomLabels && sortedCustomLabels[index] 
                ? sortedCustomLabels[index]
                : format.formatValue(item.size, formatTemplate);

            // Add the corresponding label (aligned to the top of the circle)
            const text = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "text"
            );
            text.setAttribute("x", labelX.toString());
            text.setAttribute("y", labelY.toString());
            text.setAttribute("alignment-baseline", "middle");
            text.setAttribute("fill", circleOptions.labelTextColor);
            text.setAttribute("font-size", "10px");
            text.textContent = labelText;

            svg.appendChild(text);

            const textWidth = this.getSvgTextWidth(text, labelText, labelFontSize);
            maxLabelWidth = Math.max(maxLabelWidth, textWidth);

        });

        // Calculate the farthest right point of the label
        const farthestLabelX = labelAnchorX + maxLabelWidth;
        const svgWidth = Math.ceil(farthestLabelX + rightSvgPadding);
        const svgHeight = Math.ceil(Math.max(maxCircleBottom, maxLabelBaseline) + bottomSvgPadding);
        svg.setAttribute("width", `${svgWidth}px`);
        svg.setAttribute("height", `${svgHeight}px`);
        svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
        svg.setAttribute("preserveAspectRatio", "xMinYMin meet");

        circleLegendItemsContainer.appendChild(svg);

        if (Array.isArray(measureLegendEntries) && measureLegendEntries.length > 0) {
            const measureLegend = this.buildCircleMeasureLegend(measureLegendEntries, circleOptions);
            circleLegendItemsContainer.appendChild(measureLegend);
        }
    }

    private getSvgTextWidth(textElement: SVGTextElement, label: string, fontSize: number): number {
        if (!label) {
            return 0;
        }

        try {
            if (typeof (textElement as any).getComputedTextLength === "function") {
                const length = (textElement as any).getComputedTextLength();
                if (Number.isFinite(length) && length > 0) {
                    return length;
                }
            }
            if (typeof (textElement as any).getBBox === "function") {
                const box = (textElement as any).getBBox();
                if (box && Number.isFinite(box.width) && box.width > 0) {
                    return box.width;
                }
            }
        } catch {
            // fall through to canvas measurement
        }

        return this.measureTextWidthWithCanvas(label, fontSize);
    }

    private measureTextWidthWithCanvas(text: string, fontSize: number): number {
        if (typeof document === "undefined" || typeof document.createElement !== "function") {
            return text.length * fontSize * 0.6;
        }

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
            return text.length * fontSize * 0.6;
        }

        context.font = `${fontSize}px Arial`;
        const metrics = context.measureText(text);
        return metrics.width;
    }

    createChoroplethLegend(
        colorValues: number[],
        classBreaks: number[],
        colorScale: any,
        options: ChoroplethOptions,
        formatTemplate: string = "{:.0f}",
        formatString?: string,
        cultureSelector?: string

    ) {


        // Clear or create container
        if (!this.choroplethLegendContainer) {
            this.choroplethLegendContainer = document.createElement("div");
            this.mainContainer.appendChild(this.choroplethLegendContainer);
        } else {
            this.clearContainer(this.choroplethLegendContainer);
            this.choroplethLegendContainer.style.display = "flex";
        }        

        // Create legend items container
        const choroplethItemsContainer = document.createElement("div");
        this.choroplethLegendContainer.appendChild(choroplethItemsContainer);

        // Set basic visibility
        this.choroplethLegendContainer.style.display = "flex";
        this.choroplethLegendContainer.style.padding = "5px";

        // Add title
        const title = document.createElement("div");
        title.textContent = options.legendTitle;
        title.style.color = options.legendTitleColor;
        title.style.fontSize = "12px";
        title.style.fontWeight = "bold";
        title.style.marginBottom = "5px";
        choroplethItemsContainer.appendChild(title); // Title is inside the items container


        // Collect legend entries and normalize colors
        type LegendEntry = {
            label: string;
            color: string;
            sortKeyNumber?: number;
            sortKeyText?: string;
            secondaryNumber?: number;
        };

        const legendEntries: LegendEntry[] = [];
        const normalizedColorScale: string[] = Array.isArray(colorScale)
            ? [...colorScale]
            : Object.values(colorScale);

        const numericFormatter = this.buildValueFormatter(formatString, cultureSelector, colorValues);

        const formatBreakValue = (value: any): string => {
            if (value === null || value === undefined) {
                return "";
            }
            if (typeof value !== "number") {
                return String(value);
            }
            if (!Number.isFinite(value)) {
                return value.toString();
            }
            if (numericFormatter) {
                try {
                    const formatted = numericFormatter.format(value);
                    if (formatted !== undefined && formatted !== null) {
                        return formatted;
                    }
                } catch {
                    // Fallback to default formatting when formatter fails
                }
            }
            if (Number.isInteger(value)) {
                return format.formatValue(value, formatTemplate);
            }

            const normalized = value.toString();
            if (normalized.toLowerCase().includes("e")) {
                const localeString = value.toLocaleString(undefined, {
                    useGrouping: false,
                    maximumFractionDigits: 20
                });
                return localeString.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");
            }

            return normalized.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");
        };

        if (options.classificationMethod === ClassificationMethods.Unique) {
            const uniqueValues = classBreaks;
            const maxLegendItems = Math.min(options.classes || 7, 7);
            const colorPool = normalizedColorScale.slice(0, maxLegendItems);
            while (colorPool.length < Math.min(uniqueValues.length, maxLegendItems)) {
                colorPool.push("#000000");
            }

            for (let i = 0; i < Math.min(uniqueValues.length, maxLegendItems); i++) {
                const value = uniqueValues[i];
                const entry: LegendEntry = {
                    label: formatBreakValue(value),
                    color: colorPool[i] || "#000000"
                };
                if (typeof value === "number" && Number.isFinite(value)) {
                    entry.sortKeyNumber = value;
                    entry.secondaryNumber = value;
                } else if (value !== null && value !== undefined) {
                    entry.sortKeyText = String(value).toLowerCase();
                }
                legendEntries.push(entry);
            }
        } else {
            if (classBreaks.length === 2 && classBreaks[0] === classBreaks[1]) {
                const value = classBreaks[0];
                const entry: LegendEntry = {
                    label: formatBreakValue(value),
                    color: normalizedColorScale[0] || "#000000"
                };
                if (typeof value === "number" && Number.isFinite(value)) {
                    entry.sortKeyNumber = value;
                    entry.secondaryNumber = value;
                } else if (value !== null && value !== undefined) {
                    entry.sortKeyText = String(value).toLowerCase();
                }
                legendEntries.push(entry);
            } else {
                for (let i = 0; i < classBreaks.length - 1; i++) {
                    const lower = classBreaks[i];
                    const upper = classBreaks[i + 1];
                    const entry: LegendEntry = {
                        label: `${formatBreakValue(lower)} - ${formatBreakValue(classBreaks[i + 1])}`,
                        color: normalizedColorScale[i] || "#000000"
                    };
                    if (typeof lower === "number" && Number.isFinite(lower)) {
                        entry.sortKeyNumber = lower;
                    } else if (lower !== null && lower !== undefined) {
                        entry.sortKeyText = String(lower).toLowerCase();
                    }
                    if (typeof upper === "number" && Number.isFinite(upper)) {
                        entry.secondaryNumber = upper;
                    }
                    legendEntries.push(entry);
                }
            }
        }

        if (legendEntries.length === 0) {
            return;
        }

        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
        legendEntries.sort((a, b) => {
            const aHasNumber = typeof a.sortKeyNumber === "number";
            const bHasNumber = typeof b.sortKeyNumber === "number";

            if (aHasNumber && bHasNumber) {
                const diff = (a.sortKeyNumber as number) - (b.sortKeyNumber as number);
                if (diff !== 0) {
                    return diff;
                }
                if (typeof a.secondaryNumber === "number" && typeof b.secondaryNumber === "number") {
                    return (a.secondaryNumber as number) - (b.secondaryNumber as number);
                }
                return 0;
            }

            if (aHasNumber !== bHasNumber) {
                return aHasNumber ? -1 : 1;
            }

            const aText = (a.sortKeyText ?? a.label ?? "").toString();
            const bText = (b.sortKeyText ?? b.label ?? "").toString();
            return collator.compare(aText, bText);
        });

        // Calculate max width when needed
        let maxWidth = 0;
        const needsUniformWidth =
            (options.legendOrientation === LegendOrientations.Horizontal && [LegendLabelPositions.Top, LegendLabelPositions.Center, LegendLabelPositions.Bottom].includes(options.legendLabelPosition as any)) ||
            (options.legendOrientation === LegendOrientations.Vertical && options.legendLabelPosition === LegendLabelPositions.Center);

        if (needsUniformWidth) {
            const tempDiv = document.createElement("div");
            tempDiv.style.position = "absolute";
            tempDiv.style.visibility = "hidden";
            tempDiv.style.whiteSpace = "nowrap";
            tempDiv.style.fontSize = "10px";
            if (options.legendLabelPosition === LegendLabelPositions.Center) {
                tempDiv.style.padding = "0 4px";
            }
            document.body.appendChild(tempDiv);

            legendEntries.forEach(entry => {
                tempDiv.textContent = entry.label;
                maxWidth = Math.max(maxWidth, tempDiv.offsetWidth);
            });

            document.body.removeChild(tempDiv);
        }

        // Create items container
        const itemsContainer = document.createElement("div");
        itemsContainer.style.display = "flex";
        itemsContainer.style.flexDirection = options.legendOrientation === LegendOrientations.Vertical ? "column" : "row";
        itemsContainer.style.gap = `${options.legendItemMargin}px`;
        itemsContainer.style.alignItems = "flex-start";

        // Create legend items
        legendEntries.forEach(entry => {
            const legendItem = this.createChoroplethLegendItem(
                entry.label,
                entry.color,
                (options.layerOpacity ?? 1).toString(),
                options.legendLabelsColor,
                options.legendLabelPosition,
                options.legendOrientation,
                maxWidth
            );
            itemsContainer.appendChild(legendItem);
        });

        choroplethItemsContainer.appendChild(itemsContainer);

        this.choroplethLegendContainer.appendChild(choroplethItemsContainer);
    }

    private buildValueFormatter(
        formatString?: string,
        cultureSelector?: string,
        values?: number[]
    ): ReturnType<typeof valueFormatter.create> | undefined {
        if (!formatString) {
            return undefined;
        }

        const sampleValue = values?.find(v => typeof v === "number" && Number.isFinite(v));

        try {
            return valueFormatter.create({
                format: formatString,
                cultureSelector,
                value: sampleValue
            });
        } catch {
            return undefined;
        }
    }

    showLegend(type: 'circle' | 'choropleth') {
        const container = type === 'circle'
            ? this.circleLegendContainer
            : this.choroplethLegendContainer;

        if (container) {
            container.style.display = "flex";
        }
    }

    hideLegend(type: 'circle' | 'choropleth') {
        const container = type === 'circle'
            ? this.circleLegendContainer
            : this.choroplethLegendContainer;

        if (container) {
            container.style.display = "none";
        }
    }

    getCircleLegendContainer() {
        return this.circleLegendContainer;
    }

    getChoroplethLegendContainer() {
        return this.choroplethLegendContainer;
    }

    clearContainer(container: HTMLElement) {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    private buildCircleMeasureLegend(entries: CircleMeasureLegendEntry[], circleOptions: CircleOptions): HTMLElement {
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.flexDirection = "row";
        container.style.flexWrap = "wrap";
        container.style.gap = "8px";
        container.style.marginTop = "10px";
        container.style.alignItems = "center";

        entries.forEach((entry) => {
            if (!entry?.name || !entry?.color) {
                return;
            }

            const item = document.createElement("div");
            item.style.display = "flex";
            item.style.alignItems = "center";
            item.style.gap = "6px";

            const swatch = document.createElement("span");
            swatch.style.display = "inline-block";
            swatch.style.width = "6px";
            swatch.style.height = "6px";
            swatch.style.borderRadius = "50%";
            swatch.style.border = `${Math.max(circleOptions.legendItemStrokeWidth ?? 0, 0)}px solid ${circleOptions.legendItemStrokeColor ?? "transparent"}`;
            swatch.style.backgroundColor = this.resolveCircleLegendColor(entry.color, entry.opacity);

            const label = document.createElement("span");
            label.textContent = entry.name;
            label.style.fontSize = "10px";
            label.style.color = circleOptions.labelTextColor;
            label.style.whiteSpace = "nowrap";

            item.appendChild(swatch);
            item.appendChild(label);
            container.appendChild(item);
        });

        return container;
    }

    private resolveCircleLegendColor(color: string, opacity: number | undefined): string {
        if (!color) {
            return "transparent";
        }

        const boundedOpacity = typeof opacity === "number" && !Number.isNaN(opacity)
            ? Math.max(0, Math.min(1, opacity))
            : undefined;

        if (color.startsWith("#") && boundedOpacity !== undefined) {
            return this.hexToRgba(color, boundedOpacity);
        }

        if ((color.startsWith("rgb(") || color.startsWith("rgba(")) && boundedOpacity !== undefined) {
            try {
                const parts = color
                    .replace(/rgba?\(/u, "")
                    .replace(/\)/u, "")
                    .split(",")
                    .map(part => part.trim());
                if (parts.length >= 3) {
                    const [r, g, b] = parts;
                    return `rgba(${r}, ${g}, ${b}, ${boundedOpacity})`;
                }
            } catch {
                // fall through
            }
        }

        return color;
    }

    // Helper to round a value to the nearest 'nice' number (100s, 1000s, etc)
    private roundToNiceNumber(value: number): number {
        if (value === 0) return 0;
        const absValue = Math.abs(value);
        const exponent = Math.floor(Math.log10(absValue));
        const base = Math.pow(10, exponent);
        const rounded = Math.round(value / base) * base;
        return rounded;
    }

    private getProportionalCircleLegendData(
        sizeValues: number[],
        radii: number[],
        minRadiusThreshold: number = 5,
        roundOffLegendValues: boolean = false
    ) {
        // Validate inputs
        if (sizeValues.length !== radii.length) {
            return [];
        }

        // Filter out invalid/negative values
        const validData = sizeValues
            .map((size, index) => ({ size, radius: radii[index] }))
            .filter((item) => item.size >= 0 && item.radius >= 0);

        if (validData.length === 0) {
            return [];
        }

        // If we have exactly 3 values (min, mid, max), use them directly
        // This is the case when called from the updated renderCircleLegend method
        if (validData.length === 3) {
            const sortedData = [...validData].sort((a, b) => a.size - b.size);
            let result = sortedData.map(item => ({
                size: roundOffLegendValues ? this.roundToNiceNumber(item.size) : item.size,
                radius: item.radius
            }));
            return result;
        }

        // Legacy logic for when full data arrays are passed
        // Sort by size
        const sortedData = [...validData].sort((a, b) => a.size - b.size);
        let min = sortedData[0];
        let max = sortedData[sortedData.length - 1];

        // Edge case: All values are identical
        if (min.size === max.size) {
            if (roundOffLegendValues) {
                const rounded = this.roundToNiceNumber(min.size);
                return [
                    { size: rounded, radius: min.radius },
                    { size: rounded, radius: min.radius },
                    { size: rounded, radius: min.radius }
                ];
            } else {
                return [min, min, min];
            }
        }

        // Dynamic medium calculation
        let mediumSize: number;
        const range = max.size - min.size;

        // Case 1: Zero-inflated data (min is zero)
        if (min.size === 0) {
            mediumSize = Math.round(max.size * 0.25); // 25% of max instead of 50%
        }
        // Case 2: Small range handling
        else if (range < max.size * 0.1) { // Less than 10% range
            mediumSize = min.size + Math.round(range * 0.33); // 33% of range
        }
        // Default case
        else {
            mediumSize = Math.round((min.size + max.size) / 2); // True midpoint
        }

        // Scale radius proportionally with safety checks
        const scaleFactor = max.radius / max.size;
        let mediumRadius = scaleFactor * mediumSize;

        // Ensure visual distinction between min/medium/max
        if (mediumRadius - min.radius < minRadiusThreshold) {
            mediumRadius = min.radius + minRadiusThreshold;
        }
        if (max.radius - mediumRadius < minRadiusThreshold) {
            mediumRadius = max.radius - minRadiusThreshold;
        }

        // Round min, medium, max sizes to nice numbers if flag is set
        let minSizeOut = min.size;
        let mediumSizeOut = mediumSize;
        let maxSizeOut = max.size;
        if (roundOffLegendValues) {
            minSizeOut = this.roundToNiceNumber(min.size);
            mediumSizeOut = this.roundToNiceNumber(mediumSize);
            maxSizeOut = this.roundToNiceNumber(max.size);
        }
        return [
            { size: minSizeOut, radius: min.radius },
            { size: mediumSizeOut, radius: mediumRadius },
            { size: maxSizeOut, radius: max.radius }
        ];
    }

    private createChoroplethLegendItem(
        labelText: string,
        color: string,
        opacity: string,
        labelColor: string,
        labelPosition: string,
        orientation: string,
        maxWidth: number
    ): HTMLElement {
        const container = document.createElement("div");
        const colorBox = document.createElement("div");
        const label = document.createElement("div");

        // Configure container layout
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.gap = "0px";

        // Handle different layouts
        if (orientation === LegendOrientations.Vertical) {
            if ([LegendLabelPositions.Left, LegendLabelPositions.Right].includes(labelPosition as any)) {
                container.style.flexDirection = labelPosition === LegendLabelPositions.Left ? "row-reverse" : "row";
                container.style.width = "100%";
                container.style.justifyContent = labelPosition === LegendLabelPositions.Left ? "flex-end" : "flex-start";
            } else {
                container.style.flexDirection = "column";
            }
        } else {
            container.style.flexDirection = [LegendLabelPositions.Top, LegendLabelPositions.Bottom].includes(labelPosition as any)
                ? (labelPosition === LegendLabelPositions.Top ? "column-reverse" : "column")
                : "row";
        }

        // Configure color box sizing
        const useUniformWidth =
            (orientation === LegendOrientations.Horizontal && [LegendLabelPositions.Top, LegendLabelPositions.Center, LegendLabelPositions.Bottom].includes(labelPosition as any)) ||
            (orientation === LegendOrientations.Vertical && labelPosition === LegendLabelPositions.Center);

        colorBox.style.height = "20px";
        // Use RGBA for background color with opacity
        let boxBgColor = color;
        let boxOpacity = parseFloat(opacity);
        if (color.startsWith('#') && !isNaN(boxOpacity)) {
            boxBgColor = this.hexToRgba(color, boxOpacity);
        }
        colorBox.style.backgroundColor = boxBgColor;
        colorBox.style.border = "0px solid #ccc";
        colorBox.style.position = "relative";

        if (useUniformWidth) {
            colorBox.style.width = `${maxWidth}px`;
            if (labelPosition === LegendLabelPositions.Center) {
                colorBox.style.display = "flex";
                colorBox.style.alignItems = "center";
                colorBox.style.justifyContent = "center";
                colorBox.style.padding = "0 4px";
            }
        } else {
            colorBox.style.width = "20px";
        }

        // Configure label
        label.textContent = labelText;
        label.style.color = labelColor;
        label.style.opacity = "100%";
        label.style.fontSize = "10px";
        label.style.whiteSpace = "nowrap";

        // Handle positioning
        if (labelPosition === LegendLabelPositions.Center) {
            colorBox.appendChild(label);
            container.appendChild(colorBox);
        } else {
            if ([LegendLabelPositions.Top, LegendLabelPositions.Left].includes(labelPosition as any)) {
                container.appendChild(label);
                container.appendChild(colorBox);
            } else {
                container.appendChild(colorBox);
                container.appendChild(label);
            }
        }

        container.setAttribute("data-legend-label", labelText);

        return container;
    }

    // Helper: Convert hex color to rgba with opacity
    public hexToRgba(hex: string, opacity: number) {
        hex = hex.replace('#', '');
        let bigint = parseInt(hex, 16);
        let r = (bigint >> 16) & 255;
        let g = (bigint >> 8) & 255;
        let b = bigint & 255;
        return `rgba(${r},${g},${b},${opacity})`;
    }
}