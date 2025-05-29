
export function formatValue(value: number, formatTemplate: string): string {
    let formattedValue: number;
    let suffix: string = "";

    // Step 1: Check the magnitude of the value and adjust accordingly
    if (value >= 1_000_000_000_000) {
        // Trillions
        formattedValue = value / 1_000_000_000_000;
        suffix = "T";
    } else if (value >= 1_000_000_000) {
        // Billions
        formattedValue = value / 1_000_000_000;
        suffix = "B";
    } else if (value >= 1_000_000) {
        // Millions
        formattedValue = value / 1_000_000;
        suffix = "M";
    } else if (value >= 1_000) {
        // Thousands
        formattedValue = value / 1_000;
        suffix = "k";
    } else {
        formattedValue = value; // If less than 1,000, no adjustment needed
    }


    // Step 2: Handle dynamic formatting based on the template
    // Extract the decimal precision (e.g., ".1f" or ".2f")
    const match = formatTemplate.match(/{:(\.\d+f)}/);

    if (match) {
        // Extract the precision (e.g., '.1f', '.2f', etc.)
        const precision = match[1];

        // Apply the precision using toFixed or toPrecision
        if (precision === ".0f") {
            formattedValue = Math.round(formattedValue); // No decimal places
        } else {
            const decimals = parseInt(precision.replace(".", "").replace("f", ""));
            formattedValue = parseFloat(formattedValue.toFixed(decimals)); // Format with decimal places
        }
    }

    // Step 3: Return the formatted value with the suffix
    return `${formattedValue}${suffix}`;
}