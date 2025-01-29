
import { ChoroplethOptions, CircleOptions } from "./types";

import * as util from "./utils"



export function createChoroplethLegend(
    legendContainer: HTMLElement,
    colorValues: number[],
    classBreaks: number[],
    colorScale: any,
    options: ChoroplethOptions,
    legendLabelPosition: "top" | "inside" | "bottom" | "right" | "left" = "inside",
    formatTemplate: string = "{:.0f}",
    titleAlignment: "left" | "center" | "right" = "left",
    gapSize: number = 2.5
): void {
    const uniqueColorValues: number[] = [...new Set(colorValues)].sort(
        (a, b) => a - b
    );

    //const legendContainer = this.choroplethLegend;
    if (!legendContainer) return;

    // Clear existing legend
    while (legendContainer.firstChild) {
        legendContainer.removeChild(legendContainer.firstChild);
    }

    // compute legend background color and opacity
    const opacity = options.legendBackgroundOpacity / 100;
    const bgColor = util.hexToRgba(options.legendBackgroundColor, opacity);

    // Style the legend container
    legendContainer.style.display = "flex";
    legendContainer.style.flexDirection = "column";
    legendContainer.style.alignItems = "flex-start";
    legendContainer.style.gap = "5px";
    (legendContainer.style.backgroundColor = bgColor), //"rgba(255, 255, 255, 0.5)";
        (legendContainer.style.border = "none");
    legendContainer.style.padding = "5px";

    // Add title to the legend with customizable alignment
    const title = document.createElement("div");
    title.textContent = options.legendTitle;
    title.style.color = options.legendTitleColor;
    title.style.fontSize = "12px";
    title.style.fontWeight = "bold";
    title.style.marginBottom = "5px";

    // Align the title based on user selection
    title.style.textAlign = titleAlignment;

    // Align the title itself depending on the alignment choice
    if (titleAlignment === "left") {
        title.style.marginLeft = "0";
    } else if (titleAlignment === "center") {
        title.style.marginLeft = "auto";
        title.style.marginRight = "auto";
    } else if (titleAlignment === "right") {
        title.style.marginLeft = "auto";
    }

    // Append the title to the legend
    legendContainer.appendChild(title);

    // Create horizontal layout for legend items
    const itemsContainer = document.createElement("div");
    itemsContainer.style.display = "flex";
    itemsContainer.style.flexDirection = "row";
    itemsContainer.style.alignItems = "flex-start";
    itemsContainer.style.gap = `${gapSize}px`;

    if (options.classifyData) {
        // Classified Mode
        for (let i = 0; i < classBreaks.length - 1; i++) {
            const color = colorScale[i];
            let labelText = "";

            // Determine label text based on index
            labelText = `${util.formatValue(
                classBreaks[i],
                formatTemplate
            )} - ${util.formatValue(classBreaks[i + 1], formatTemplate)}`;

            // Create legend item
            const legendItem = createChoroplethLegendItem(
                labelText,
                color,
                options.legendLabelsColor,
                legendLabelPosition
            );
            itemsContainer.appendChild(legendItem);
        }
    } else {
        // Unique Value Mode
        for (let i = 0; i < uniqueColorValues.length; i++) {
            const uniqueValue = uniqueColorValues[i];
            const color = colorScale[i]; // Get color from colorScale
            const labelText = util.formatValue(uniqueValue, formatTemplate); // Format the unique value

            // Create legend item
            const legendItem = createChoroplethLegendItem(
                labelText,
                color,
                options.legendLabelsColor,
                legendLabelPosition
            );
            itemsContainer.appendChild(legendItem);
        }
    }

    // Append the items container to the legend
    legendContainer.appendChild(itemsContainer);

    // Ensure the legend is visible
    legendContainer.style.display = "flex";
}

export function createProportionalCircleLegend(
    legendContainer: HTMLElement,
    sizeValues: number[],
    radii: number[],
    legendTitle: string,
    circleOptions: CircleOptions,
    formatTemplate: string = "{:.0f}"
) {

    if (!legendContainer) {
        console.error("Container not found");
        return;
    }

    console.log("Creating proportional circle legend");

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
    title.textContent = legendTitle;
    title.style.color = circleOptions.legendTitleColor;
    title.style.fontSize = "12px";
    title.style.fontWeight = "bold";
    title.style.marginBottom = "5px";

    // Append the title to the legend
    legendContainer.appendChild(title);

    // Get legend data using the provided function
    const legendData = getProportionalCircleLegendData(sizeValues, radii);

    console.log(legendData);

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

    console.log("Circle Legend", svg);

    // Append the SVG to the container
    legendContainer.appendChild(svg);
}

// function to get proportional circle legend data i.e min, medium and max
function getProportionalCircleLegendData(sizeValues: number[], radii: number[]) {

    if (sizeValues.length !== radii.length) {
        console.log("sizeValues and radii arrays must have the same length");
        return [];
    }

    // Sort by sizeValues
    const sortedData = sizeValues
        .map((size, index) => ({ size, radius: radii[index] }))
        .sort((a, b) => a.size - b.size);

    // Extract min and max
    const min = sortedData[0];
    const max = sortedData[sortedData.length - 1];

    // Compute medium as half of max size, rounded to the nearest thousand
    const mediumSize = Math.round(max.size / 2 / 1000) * 1000;
    const mediumRadius = (max.radius / max.size) * mediumSize; // Scale radius proportionally

    const medium = { size: mediumSize, radius: mediumRadius };

    return [min, medium, max];
}


// function to create a legend item
function createChoroplethLegendItem(
    labelText: string,
    boxColor: string,
    labelColor: string,
    labelPosition: "top" | "inside" | "bottom" | "right" | "left"
): HTMLElement {
    const legendItem = document.createElement("div");
    legendItem.style.display = "flex";
    legendItem.style.flexDirection = "column";
    legendItem.style.alignItems = "center";

    // Calculate the dynamic width of the color box
    const boxWidth = `${labelText.length * 5 + 10}px`;

    // Create color box
    const colorBox = document.createElement("div");
    colorBox.style.position = "relative";
    colorBox.style.width = boxWidth;
    colorBox.style.height = "20px";
    colorBox.style.backgroundColor = boxColor;
    colorBox.style.textAlign = "center";
    colorBox.style.display = "flex";
    colorBox.style.justifyContent = "center";
    colorBox.style.alignItems =
        labelPosition === "inside" ? "center" : "flex-start";

    // Add label
    const label = document.createElement("span");
    label.textContent = labelText;
    label.style.color = labelColor; //labelPosition === "inside" ? "#fff" : "#000";
    label.style.fontSize = "10px";

    // Append label based on position
    if (labelPosition === "top") {
        label.style.marginBottom = "5px";
        legendItem.appendChild(label);
        legendItem.appendChild(colorBox);
    } else if (labelPosition === "bottom") {
        label.style.marginTop = "5px";
        legendItem.appendChild(colorBox);
        legendItem.appendChild(label);
    } else {
        colorBox.appendChild(label);
        legendItem.appendChild(colorBox);
    }

    return legendItem;
}


