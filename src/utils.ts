import { fromLonLat, toLonLat, transformExtent } from "ol/proj";
import { Extent, getCenter, getWidth } from 'ol/extent.js';
import * as topojson from 'topojson-client';



// Helper function to validate GeoJSON data
export function isValidGeoJson(data: any): boolean {
    if (!data || typeof data !== "object" || !data.type) {
        return false;
    }

    const validGeoJsonTypes = [
        "Feature",
        "FeatureCollection",
        "Point",
        "LineString",
        "Polygon",
        "MultiPoint",
        "MultiLineString",
        "MultiPolygon",
    ];

    if (!validGeoJsonTypes.includes(data.type)) {
        return false;
    }

    // Additional checks for "Feature" and "FeatureCollection"
    if (
        data.type === "Feature" &&
        (!data.geometry || typeof data.geometry !== "object")
    ) {
        return false;
    }

    if (data.type === "FeatureCollection" && !Array.isArray(data.features)) {
        return false;
    }

    return true;
}

// Helper function to validate TopoJSON data
export function isValidTopoJson(data: any): boolean {
    if (!data || typeof data !== "object") {
        return false;
    }

    // TopoJSON must have a "type" property, which should be "Topology"
    if (data.type !== "Topology") {
        return false;
    }

    // TopoJSON must have an "objects" property, which should be an object
    if (!data.objects || typeof data.objects !== "object") {
        return false;
    }

    // Validate that "arcs" (if present) is an array
    if (data.arcs && !Array.isArray(data.arcs)) {
        return false;
    }

    // Validate that "transform" (if present) has scale and translate properties
    if (data.transform) {
        const { scale, translate } = data.transform;
        if (
            !Array.isArray(scale) ||
            scale.length !== 2 ||
            !Array.isArray(translate) ||
            translate.length !== 2
        ) {
            return false;
        }
    }

    // Validate each object in "objects"
    for (const key in data.objects) {
        const object = data.objects[key];
        if (
            !object ||
            typeof object !== "object" ||
            !["Point", "LineString", "Polygon", "MultiPoint", "MultiLineString", "MultiPolygon", "GeometryCollection"].includes(object.type)
        ) {
            return false;
        }

        // Additional validation for GeometryCollection
        if (object.type === "GeometryCollection" && !Array.isArray(object.geometries)) {
            return false;
        }
    }

    return true;
}

// Debounce function
export function debounce(func: Function, delay: number) {
    let timeoutId: number | undefined;
    return function (this: any, ...args: any[]) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/* URL validators */
export function isValidURL(url: string): boolean {
    try {
        new URL(url); // This checks if the URL is well-formed.
        return true;
    } catch {
        return false;
    }
}

export function enforceHttps(url: string): boolean {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.protocol === 'https:';
    } catch {
        return false;
    }
}

export function hasOpenRedirect(url: string): boolean {
    try {
        const parsedUrl = new URL(url);

        // Dynamically extract the base domain from the provided URL
        const baseDomain = parsedUrl.hostname;

        // Ensure the URL's hostname matches its base domain
        return parsedUrl.hostname !== baseDomain;
    } catch {
        return true; // Return true if the URL is invalid
    }
}


export async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        return response;
    } catch (error) {
        throw new Error("Request timed out or failed.");
    } finally {
        clearTimeout(id);
    }
}


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

// Fetch GeoJSON data without caching
export async function fetchJsonBoundaryData(serviceUrl: string): Promise<any> {

    const response = await fetch(serviceUrl);

    if (!response.ok) {
        console.error(`Failed to fetch JSON boundary data: ${response.statusText}`);
        //throw new Error(`Failed to fetch JSON boundary data: ${response.statusText}`);
    }

    const jsonData = await response.json();

    if (await isValidJsonResponse(jsonData)) {
        return jsonData;
    } else {
        console.error("Invalid JSON response.");
        //throw new Error("Invalid JSON response.");
    }
}

// Initialize IndexedDB
export function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("GeoJsonCacheDB", 1);

        request.onupgradeneeded = (event) => {
            const db = request.result;
            if (!db.objectStoreNames.contains("geoJsonData")) {
                db.createObjectStore("geoJsonData", { keyPath: "key" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function cacheJsonData(cache: Record<string, { data: any; timestamp: number }>, key: string, data: any): Promise<void> {
    try {
        const db = await openDatabase();

        // Start a transaction and get the object store
        const transaction = db.transaction("jsonBoundaryData", "readwrite");
        const store = transaction.objectStore("jsonBoundaryData");

        // Check for existing data
        const existingData = await new Promise<any | undefined>((resolve) => {
            const getRequest = store.get(key);
            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => resolve(undefined);
        });

        if (existingData && existingData.data === data) {
            //console.log("Duplicate cache entry in IndexedDB. Skipping cache update.");
            return;
        }

        // Add or update the data
        const cacheEntry = { key, data, timestamp: Date.now() };
        const putRequest = store.put(cacheEntry);

        putRequest.onsuccess = () => {
            //console.log("GeoJSON data cached in IndexedDB.");
        };

        putRequest.onerror = (e) => {
            // console.error(
            //     "Error caching data in IndexedDB. Falling back to memory cache.",
            //     e
            // );
            cache[key] = { data, timestamp: Date.now() };
            //console.log("GeoJSON data cached in memory.");
        };

        // Close the transaction
        transaction.oncomplete = () => db.close();
    } catch (error) {
        if (error.name === "SecurityError") {
            //console.warn("IndexedDB is restricted in this context (e.g., file:// or incognito). Using memory cache.");
        } else {
           // console.error("IndexedDB error. Falling back to memory cache.", error);
        }

        // Memory cache fallback
        const existingCache = cache[key];
        if (existingCache && existingCache.data === data) {
            //console.log("Duplicate cache entry in memory. Skipping cache update.");
            return;
        }

        cache[key] = { data, timestamp: Date.now() };
        //console.log("jsonBoundaryData data cached in memory.");
    }
}

// Retrieve GeoJSON data from cache
export async function getCachedJsonData(cache:  Record<string, { data: any; timestamp: number }>, key: string): Promise<any | null> {
    return cache[key]?.data || null;
}

// Check if cached data is expired
export async function isCacheExpired(cache: Record<string, { data: any; timestamp: number }>, key: string, maxAge: number): Promise<boolean> {
    const cacheEntry = cache[key];
    if (!cacheEntry) return true;
    return Date.now() - cacheEntry.timestamp > maxAge;
}

// Fetch GeoJSON data with caching
export async function fetchAndCacheJsonGeoDataAsync(
    serviceUrl: string,
    cache:  Record<string, { data: any; timestamp: number }>,
    cacheKey: string,
    maxAge: number = 3600000
): Promise<any> {



    if (await isCacheExpired(cache,cacheKey, maxAge)) {

        //console.log("Fetching data from service...");

        const response = await fetch(serviceUrl);

        if (!response.ok) {
            //console.log(`Failed to fetch JSON boundary data: ${response.statusText}`);
            return;
            //throw new Error(`Failed to fetch GeoJSON data: ${response.statusText}`);
        }

        const jsonData = await response.json();

        if (await isValidJsonResponse(jsonData)) {

            await cacheJsonData(cache, cacheKey, jsonData);

            return jsonData;

        } else {
            return;
            //console.error("Invalid JSON or response error.");
            // TODO: communicate issue to user
        }

    }

    //console.log("Using cached data.");
    return await getCachedJsonData(cache,cacheKey);
}

// Helper function to validate if fetch response is valid json
export async function isValidJsonResponse(responseData: any): Promise<boolean> {
    try {

        // Validate the parsed data is an object or array
        if (typeof responseData !== "object" || responseData === null) {
            return false;
        }

        return true; // Valid JSON object or array
    } catch (error) {
        // If JSON parsing fails, the response is not valid JSON
        return false;
    }
}


// export function calculateExtent(longitudes: number[], latitudes: number[]): Extent {
//     if (longitudes.length === 0 || latitudes.length === 0) {
//         throw new Error("Longitude and latitude arrays must not be empty.");
//     }

//     if (longitudes.length !== latitudes.length) {
//         throw new Error("Longitude and latitude arrays must have the same length.");
//     }

//     const minX = Math.min(...longitudes);
//     const maxX = Math.max(...longitudes);
//     const minY = Math.min(...latitudes);
//     const maxY = Math.max(...latitudes);

//     const extent = [minX, minY, maxX, maxY];

//     const transformedExtent = transformExtent(extent, 'EPSG:4326', 'EPSG:3857');

//     return transformedExtent;
// }

// export function getElementUnderSvg(x: number, y: number): Element | null {
//     let resultingElement: Element | null;
//     const firstElement = document.elementFromPoint(x, y);

//     if (firstElement && firstElement.nodeName === "circle") {
//         const display = (firstElement as HTMLElement).style.display; // Save the display property of the SVG element
//         (firstElement as HTMLElement).style.display = "none";       // Make the SVG element invisible
//         resultingElement = document.elementFromPoint(x, y);         // Get the underlying element
//         (firstElement as HTMLElement).style.display = display;      // Restore the display property
//     } else {
//         resultingElement = firstElement;                            // Use the first element if it's not an SVG element
//     }

//     return resultingElement;
// }

// export function passEventToMap(event: WheelEvent, mapElement: HTMLElement): void {
//     const { clientX: x, clientY: y } = event;

//     // Get the topmost element under the cursor
//     const firstElement = document.elementFromPoint(x, y);

//     if (firstElement && firstElement.nodeName === 'circle') {
//         // Temporarily hide the SVG circle
//         const display = (firstElement as HTMLElement).style.display;
//         (firstElement as HTMLElement).style.display = 'none';

//         // Get the underlying element
//         const underlyingElement = document.elementFromPoint(x, y);
//         (firstElement as HTMLElement).style.display = display;

//         // If the underlying element is the map, pass the event to it
//         if (underlyingElement === mapElement) {
//             mapElement.dispatchEvent(new WheelEvent(event.type, event));
//         }
//     } else if (firstElement === mapElement) {
//         // If the event is already on the map, let it proceed
//         mapElement.dispatchEvent(new WheelEvent(event.type, event));
//     }
// }


// // Helper function to check if a point is inside a circle
// export function isPointInCircle(pointX, pointY, circleX, circleY, radius) {
//     const distanceSquared = (pointX - circleX) ** 2 + (pointY - circleY) ** 2;
//     return distanceSquared <= radius ** 2;
// }




export function isTopoJSON(json) {
    // Check if the JSON has the unique characteristics of TopoJSON
    return json.type === "Topology" &&
        typeof json.objects === "object" &&
        Array.isArray(json.arcs);
}

export function convertSingleLayerTopoJSONToGeoJSON(topojsondata) {
    
    if (!topojsondata || typeof topojsondata !== "object") {
        throw new Error("Invalid TopoJSON object provided.");
    }

    if (!topojsondata.objects || typeof topojsondata.objects !== "object") {
        throw new Error("Invalid or missing 'objects' property in TopoJSON.");
    }

    const layerNames = Object.keys(topojsondata.objects);

    if (layerNames.length !== 1) {
        throw new Error(
            `Expected a single layer in TopoJSON, but found ${layerNames.length}.`
        );
    }

    const layerName = layerNames[0]; // Extract the name of the single layer
    return topojson.feature(topojsondata, topojsondata.objects[layerName]);
}
