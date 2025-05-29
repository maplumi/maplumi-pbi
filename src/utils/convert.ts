

export function hexToRgba(hex, opacity) {
    // Remove the '#' character if it exists
    hex = hex.replace("#", "");

    // Ensure the hex code is the correct length
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    // Convert the hex code to RGB values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Return the RGBA value
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}