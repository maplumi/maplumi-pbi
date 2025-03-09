import { ChoroplethOptions, CircleOptions } from "../types/index";
import * as util from "../utils/utils";

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
        formatTemplate: string = "{:.0f}"
    ) {
        // Clear or create container
        if (!this.circleLegendContainer) {
            this.circleLegendContainer = document.createElement("div");
            this.mainContainer.appendChild(this.circleLegendContainer);
        } else {
            this.clearContainer(this.circleLegendContainer);
        }

        // Create legend items container
        const circleLegendItemsContainer = document.createElement("div");
        this.circleLegendContainer.appendChild(circleLegendItemsContainer);

        // Set basic visibility
        this.circleLegendContainer.style.display = "flex";

        circleLegendItemsContainer.style.display = "flex";
        circleLegendItemsContainer.style.flexDirection = "column";
        circleLegendItemsContainer.style.alignItems = "flex-start";
        circleLegendItemsContainer.style.height = "auto";
        circleLegendItemsContainer.style.padding = "5px";

        // Add title
        const title = document.createElement("div");
        title.textContent = circleOptions.legendTitle;
        title.style.color = circleOptions.legendTitleColor;
        title.style.fontSize = "12px";
        title.style.fontWeight = "bold";
        title.style.marginBottom = "5px";
        circleLegendItemsContainer.appendChild(title);

        // Get legend data
        const legendData = this.getProportionalCircleLegendData(sizeValues, radii);
        if (!legendData || legendData.length === 0) return;

        // Create SVG elements
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const padding = 10;
        const maxRadius = Math.max(...legendData.map((item) => item.radius));
        const centerX = maxRadius + padding;
        const bottomY = 2 * maxRadius + padding;
        let maxLabelWidth = 0;

        // Create a shallow copy of legendData and sort it in descending order based on radius. thus, the largest circle will be drawn first
        const sortedLegendData = [...legendData].sort((a, b) => b.radius - a.radius);

        sortedLegendData.forEach((item) => {
            // Calculate the Y position so all circles are aligned at the bottom
            const currentY = bottomY - item.radius;

            // Draw the circle
            const circle = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle"
            );
            circle.setAttribute("cx", centerX.toString());
            circle.setAttribute("cy", currentY.toString());
            circle.setAttribute("r", item.radius.toString());
            circle.setAttribute("stroke-width", circleOptions.strokeWidth.toString());

            // Remove fill if circleValues are more than one
            if (numberofCircleCategories === 1) {

                circle.setAttribute("stroke", circleOptions.strokeColor);
                circle.setAttribute("fill", circleOptions.color1);
                circle.setAttribute("fill-opacity", circleOptions.layer1Opacity.toString());

            } else {
                
                circle.setAttribute("stroke", circleOptions.leaderLineColor);
                circle.setAttribute("fill", "none"); // Remove fill
            }


            svg.appendChild(circle);

            // Calculate label position
            const labelX = centerX + maxRadius + 20;
            const labelY = currentY - item.radius;

            // Add the leader line
            const line = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "line"
            );
            line.setAttribute("x1", centerX.toString());
            line.setAttribute("y1", (currentY - item.radius).toString());
            line.setAttribute("x2", (labelX - 3).toString());
            line.setAttribute("y2", labelY.toString());
            line.setAttribute("stroke", circleOptions.leaderLineColor);
            line.setAttribute("stroke-width", circleOptions.leaderLineStrokeWidth.toString());

            svg.appendChild(line);

            const formattedLabel = util.formatValue(item.size, formatTemplate);

            // Add the corresponding label (aligned to the top of the circle)
            const text = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "text"
            );
            text.setAttribute("x", labelX.toString());
            text.setAttribute("y", labelY.toString());
            text.setAttribute("alignment-baseline", "middle");
            text.setAttribute("fill", circleOptions.labelTextColor);
            text.textContent = `${formattedLabel}`;

            svg.appendChild(text);

            // Measure the label width
            const tempLabel = document.createElement("div");
            tempLabel.style.position = "absolute";
            tempLabel.style.visibility = "hidden";
            tempLabel.style.whiteSpace = "nowrap";
            tempLabel.textContent = `${item.size}`;
            document.body.appendChild(tempLabel);

            const labelWidth = tempLabel.offsetWidth;
            maxLabelWidth = Math.max(maxLabelWidth, labelWidth);

            document.body.removeChild(tempLabel);

        });

        // Set SVG dimensions
        const svgWidth = centerX + maxRadius + maxLabelWidth + padding * 2 + 20;
        const svgHeight = bottomY + padding;
        svg.setAttribute("width", `${svgWidth}px`);
        svg.setAttribute("height", `${svgHeight}px`);
        svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
        svg.setAttribute("preserveAspectRatio", "xMinYMin meet");

        circleLegendItemsContainer.appendChild(svg);
    }

    createChoroplethLegend(
        colorValues: number[],
        classBreaks: number[],
        colorScale: any,
        options: ChoroplethOptions,
        formatTemplate: string = "{:.0f}",
        gapSize: number = 2.5
    ) {
        // Skip legend creation for unclassified/unique values
        if (options.classificationMethod === "u") {
            if (this.choroplethLegendContainer) {
                this.choroplethLegendContainer.style.display = "none";
            }
            return;
        }

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

        const uniqueColorValues: number[] = [...new Set(colorValues)].sort((a, b) => a - b);

        choroplethItemsContainer.style.padding = "5px";
        choroplethItemsContainer.style.display = "flex";
        choroplethItemsContainer.style.flexDirection = "column"; // Stack title and items vertically
        choroplethItemsContainer.style.gap = "5px";

        // Add title
        const title = document.createElement("div");
        title.textContent = options.legendTitle;
        title.style.color = options.legendTitleColor;
        title.style.fontSize = "12px";
        title.style.fontWeight = "bold";
        title.style.marginBottom = "5px";
        choroplethItemsContainer.appendChild(title); // Title is inside the items container

        // Collect all labels and calculate max width
        const allLabels = [];
        if (options.classificationMethod !== "u") {
            for (let i = 0; i < classBreaks.length - 1; i++) {
                allLabels.push(`${util.formatValue(classBreaks[i], formatTemplate)} - ${util.formatValue(classBreaks[i + 1], formatTemplate)}`);
            }
        } else {
            uniqueColorValues.forEach(value => {
                allLabels.push(util.formatValue(value, formatTemplate));
            });
        }

        // Calculate max width when needed
        let maxWidth = 0;
        const needsUniformWidth =
            (options.legendOrientation === "horizontal" && ["top", "center", "bottom"].includes(options.legendLabelPosition)) ||
            (options.legendOrientation === "vertical" && options.legendLabelPosition === "center");

        if (needsUniformWidth) {
            const tempDiv = document.createElement("div");
            tempDiv.style.position = "absolute";
            tempDiv.style.visibility = "hidden";
            tempDiv.style.whiteSpace = "nowrap";
            tempDiv.style.fontSize = "10px";
            if (options.legendLabelPosition === "center") {
                tempDiv.style.padding = "0 4px";
            }
            document.body.appendChild(tempDiv);

            allLabels.forEach(label => {
                tempDiv.textContent = label;
                maxWidth = Math.max(maxWidth, tempDiv.offsetWidth);
            });

            document.body.removeChild(tempDiv);
        }

        // Create items container
        const itemsContainer = document.createElement("div");
        itemsContainer.style.display = "flex";
        itemsContainer.style.flexDirection = options.legendOrientation === "vertical" ? "column" : "row";
        itemsContainer.style.gap = `${gapSize}px`;
        itemsContainer.style.alignItems = "flex-start";

        // Create legend items
        const colors = options.classificationMethod !== "u"
            ? classBreaks.slice(0, -1).map((_, i) => colorScale[i])
            : uniqueColorValues.map((_, i) => colorScale[i]);

        colors.forEach((color, i) => {
            const legendItem = this.createChoroplethLegendItem(
                allLabels[i],
                color,
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

    private getProportionalCircleLegendData(
        sizeValues: number[],
        radii: number[],
        minRadiusThreshold: number = 5
    ) {
        // Validate inputs
        if (sizeValues.length !== radii.length) {
            console.error("Arrays must have the same length");
            return [];
        }

        // Filter out invalid/negative values
        const validData = sizeValues
            .map((size, index) => ({ size, radius: radii[index] }))
            .filter((item) => item.size >= 0 && item.radius >= 0);

        if (validData.length === 0) {
            console.error("No valid positive data points");
            return [];
        }

        // Sort by size
        const sortedData = [...validData].sort((a, b) => a.size - b.size);
        const min = sortedData[0];
        const max = sortedData[sortedData.length - 1];

        // Edge case: All values are identical
        if (min.size === max.size) {
            return [min, min, min]; // Single size dominates
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

        return [
            min,
            { size: mediumSize, radius: mediumRadius },
            max
        ];
    }

    private createChoroplethLegendItem(
        labelText: string,
        color: string,
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
        container.style.gap = "4px";

        // Handle different layouts
        if (orientation === "vertical") {
            if (["left", "right"].includes(labelPosition)) {
                container.style.flexDirection = labelPosition === "left" ? "row-reverse" : "row";
                container.style.width = "100%";
                container.style.justifyContent = labelPosition === "left" ? "flex-end" : "flex-start";
            } else {
                container.style.flexDirection = "column";
            }
        } else {
            container.style.flexDirection = ["top", "bottom"].includes(labelPosition)
                ? (labelPosition === "top" ? "column-reverse" : "column")
                : "row";
        }

        // Configure color box sizing
        const useUniformWidth =
            (orientation === "horizontal" && ["top", "center", "bottom"].includes(labelPosition)) ||
            (orientation === "vertical" && labelPosition === "center");

        colorBox.style.height = "20px";
        colorBox.style.backgroundColor = color;
        colorBox.style.border = "1px solid #ccc";
        colorBox.style.position = "relative";

        if (useUniformWidth) {
            colorBox.style.width = `${maxWidth}px`;
            if (labelPosition === "center") {
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
        label.style.fontSize = "10px";
        label.style.whiteSpace = "nowrap";

        // Handle positioning
        if (labelPosition === "center") {
            colorBox.appendChild(label);
            container.appendChild(colorBox);
        } else {
            if (["top", "left"].includes(labelPosition)) {
                container.appendChild(label);
                container.appendChild(colorBox);
            } else {
                container.appendChild(colorBox);
                container.appendChild(label);
            }
        }

        return container;
    }
}