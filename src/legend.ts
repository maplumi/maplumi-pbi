
import { ChoroplethOptions, CircleOptions } from "./types";

import * as util from "./utils";

export function createProportionalCircleLegend(
    legendContainer: HTMLElement,
    sizeValues: number[],
    radii: number[],
    circleOptions: CircleOptions,
    formatTemplate: string = "{:.0f}"
) {

    if (!legendContainer) {
        console.error("Container not found");
        return;
    }

    const opacity = circleOptions.legendBackgroundOpacity / 100;
    const bgColor = circleOptions.legendBackgroundColor;
    const bottomMargin = `${circleOptions.legendBottomMargin}px`;


    // compute container background color and opacity
    const legendBbgColor = util.hexToRgba(bgColor, opacity);

    // Set background for container and SVG
    legendContainer.style.backgroundColor = legendBbgColor;
    legendContainer.style.bottom = bottomMargin;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.display = "block"; // Ensure SVG takes up the full container width/height

    // Clear previous content
    while (legendContainer.firstChild) {
        legendContainer.removeChild(legendContainer.firstChild);
    }

    // Set container styles for centering
    legendContainer.style.display = "flex";
    legendContainer.style.flexDirection = "column"; // Stack the title and legend items vertically
    legendContainer.style.alignItems = "flex-start"; // Align the items to the left by default
    legendContainer.style.height = "auto"; // Let container height adjust dynamically
    legendContainer.style.padding = "5px"; // Uniform padding around container

    // Add title to the legend with customizable alignment
    const title = document.createElement("div");
    title.textContent = circleOptions.legendTitle;
    title.style.color = circleOptions.legendTitleColor;
    title.style.fontSize = "12px";
    title.style.fontWeight = "bold";
    title.style.marginBottom = "5px";

    // Append the title to the legend
    legendContainer.appendChild(title);

    // Get legend data using the provided function
    const legendData = getProportionalCircleLegendData(sizeValues, radii);

    //console.log(legendData);

    if (!legendData || legendData.length === 0) {
        console.error("Invalid legend data");
        return;
    }

    // Define padding around circles
    const padding = 10;

    // Determine the maximum radius for alignment
    const maxRadius = Math.max(...legendData.map((item) => item.radius));

    // Positioning variables
    const centerX = maxRadius + padding; // X position for all circles
    const bottomY = 2 * maxRadius + padding; // Y position of the largest circle's bottom
    let maxLabelWidth = 0; // Track the maximum label width

    // Add circles, labels, and leader lines to the legend
    legendData.forEach((item) => {
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
        circle.setAttribute("stroke", circleOptions.legendItemsColor);
        circle.setAttribute("fill", "none");

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
        line.setAttribute("stroke", circleOptions.legendItemsColor);
        line.setAttribute("stroke-width", "1");

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
        text.setAttribute("fill", circleOptions.legendItemsColor);
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

    // Calculate the viewBox dimensions based on the legend size and labels
    const svgWidth = centerX + maxRadius + maxLabelWidth + padding * 2 + 20; // 20px for spacing between circles and labels
    const svgHeight = bottomY + padding;

    // Apply viewBox and dimensions
    svg.setAttribute("width", `${svgWidth}px`);
    svg.setAttribute("height", `${svgHeight}px`);
    svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
    svg.setAttribute("preserveAspectRatio", "xMinYMin meet"); // Preserve scaling

    // Append the SVG to the container
    legendContainer.appendChild(svg);

    // Ensure the legend is visible
    legendContainer.style.display = "flex";
}

function getProportionalCircleLegendData(
    sizeValues: number[],
    radii: number[],
    minRadiusThreshold: number = 5 // Minimum visual distinction for radii
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

export function createChoroplethLegend(
    legendContainer: HTMLElement,
    colorValues: number[],
    classBreaks: number[],
    colorScale: any,
    options: ChoroplethOptions,    
    formatTemplate: string = "{:.0f}",
    gapSize: number = 2.5
): void {
    const uniqueColorValues: number[] = [...new Set(colorValues)].sort((a, b) => a - b);
    if (!legendContainer) return;

    // Clear existing legend
    while (legendContainer.firstChild) {
        legendContainer.removeChild(legendContainer.firstChild);
    }

    // Compute legend background
    const opacity = options.legendBackgroundOpacity / 100;
    const bgColor = util.hexToRgba(options.legendBackgroundColor, opacity);

    // Style legend container
    legendContainer.style.display = "flex";
    legendContainer.style.flexDirection = "column";
    legendContainer.style.alignItems = "flex-start";
    legendContainer.style.gap = "5px";
    legendContainer.style.backgroundColor = bgColor;
    legendContainer.style.padding = "5px";

    // Add title
    const title = document.createElement("div");
    title.textContent = options.legendTitle;
    title.style.color = options.legendTitleColor;
    title.style.fontSize = "12px";
    title.style.fontWeight = "bold";
    title.style.marginBottom = "5px";
    title.style.textAlign = options.legendTitleAlignment;
    legendContainer.appendChild(title);

    // Collect all labels and calculate max width
    const allLabels = [];
    if (options.classifyData) {
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
    const colors = options.classifyData 
        ? classBreaks.slice(0, -1).map((_, i) => colorScale[i])
        : uniqueColorValues.map((_, i) => colorScale[i]);

    colors.forEach((color, i) => {
        const legendItem = createChoroplethLegendItem(
            allLabels[i],
            color,
            options.legendLabelsColor,
            options.legendLabelPosition,
            options.legendOrientation,
            maxWidth
        );
        itemsContainer.appendChild(legendItem);
    });

    legendContainer.appendChild(itemsContainer);
}

function createChoroplethLegendItem(
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


