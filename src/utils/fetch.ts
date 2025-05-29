


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
export async function getCachedJsonData(cache: Record<string, { data: any; timestamp: number }>, key: string): Promise<any | null> {
    return cache[key]?.data || null;
}

// Check if cached data is expired
export async function isCacheExpired(cache: Record<string, { data: any; timestamp: number }>, key: string, maxAge: number): Promise<boolean> {
    const cacheEntry = cache[key];
    if (!cacheEntry) return true;
    return Date.now() - cacheEntry.timestamp > maxAge;
}

// Fetch GeoJSON data with caching
export async function getGeoDataAsync(
    serviceUrl: string,
    cache: Record<string, { data: any; timestamp: number }>,
    cacheKey: string,
    signal: AbortSignal,
    maxAge: number = 3600000
): Promise<any> {

    if (await isCacheExpired(cache, cacheKey, maxAge)) {

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
    return await getCachedJsonData(cache, cacheKey);
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


