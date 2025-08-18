/*
 * GeoBoundaries API Service
 * 
 * This service handles integration with the geoBoundaries API
 * to fetch administrative boundary data dynamically.
 */

import { ChoroplethOptions } from "../types/index";
import { VisualConfig } from "../config/VisualConfig";

export interface GeoBoundariesMetadata {
    boundaryID: string;
    boundaryName: string;
    boundaryISO: string;
    boundaryYearRepresented: string;
    boundaryType: string;
    boundaryCanonical: string;
    boundarySource: string;
    boundaryLicense: string;
    licenseDetail: string;
    licenseSource: string;
    sourceDataUpdateDate: string;
    buildDate: string;
    Continent: string;
    "UNSDG-region": string;
    "UNSDG-subregion": string;
    worldBankIncomeGroup: string;
    admUnitCount: string;
    meanVertices: string;
    minVertices: string;
    maxVertices: string;
    meanPerimeterLengthKM: string;
    minPerimeterLengthKM: string;
    maxPerimeterLengthKM: string;
    meanAreaSqKM: string;
    minAreaSqKM: string;
    maxAreaSqKM: string;
    staticDownloadLink: string;
    gjDownloadURL: string;
    tjDownloadURL: string;
    imagePreview: string;
    simplifiedGeometryGeoJSON: string;
}

export class GeoBoundariesService {
    // In-memory caches for country list and metadata to avoid repeated network calls in a session
    private static countryItemsCache: { value: string; displayName: string }[] | null = null;
    private static countryItemsCacheTime = 0;
    private static allCountriesMetadataCache: { [release: string]: { data: GeoBoundariesMetadata[]; ts: number } } = {};

    /**
     * Constructs the geoBoundaries API URL based on the options
     */
    public static buildApiUrl(options: ChoroplethOptions): string {
        const { geoBoundariesReleaseType, geoBoundariesCountry, geoBoundariesAdminLevel } = options;
        // For ALL we still use the geoBoundaries API (ADM0 enforced by validation)
        return `${VisualConfig.GEOBOUNDARIES.BASE_URL}/${geoBoundariesReleaseType}/${geoBoundariesCountry}/${geoBoundariesAdminLevel}/`;
    }

    /**
     * Fetches metadata from the geoBoundaries API
     * Returns both the parsed metadata (data) and the underlying fetch Response (response)
     * so callers/caches can optionally honor Cache-Control headers.
     */
    public static async fetchMetadata(options: ChoroplethOptions): Promise<{ data: GeoBoundariesMetadata | null; response: Response | null }> {
        try {
            const apiUrl = this.buildApiUrl(options);
            const response = await fetch(apiUrl);

            if (!response.ok) {
                console.error(`GeoBoundaries API error: ${response.status} ${response.statusText}`);
                return { data: null, response };
            }

            const body: any = await response.json();
            // Some geoBoundaries endpoints return an array; normalize to a single metadata object.
            // Prefer the first entry that actually includes a download URL.
            let metadata: GeoBoundariesMetadata | null;
            if (Array.isArray(body)) {
                metadata = (body as any[]).find((item: any) => !!(item?.tjDownloadURL || item?.gjDownloadURL)) || null;
                if (!metadata && body.length > 0) {
                    // Fallback to first item if none includes a download URL
                    metadata = body[0] as GeoBoundariesMetadata;
                }
            } else {
                metadata = body as GeoBoundariesMetadata;
            }
            return { data: metadata, response };
        } catch (error) {
            console.error("Error fetching geoBoundaries metadata:", error);
            return { data: null, response: null };
        }
    }

    /**
     * Gets the appropriate download URL based on preferences
     * Prioritizes TopoJSON for smaller file sizes, falls back to GeoJSON
     */
    public static getDownloadUrl(metadata: GeoBoundariesMetadata, preferTopoJSON: boolean = true): string {
    return (preferTopoJSON && metadata.tjDownloadURL) ? metadata.tjDownloadURL : metadata.gjDownloadURL;
    }

    /**
     * Normalize GitHub raw URLs to media.githubusercontent.com to avoid CORS issues.
     * - https://github.com/<owner>/<repo>/raw/<sha>/<path> -> https://media.githubusercontent.com/media/<owner>/<repo>/<sha>/<path>
     * Leaves other hosts unchanged.
     */
    public static normalizeGithubRaw(url: string | undefined | null): string | null {
        if (!url) return null;
        try {
            const u = new URL(url);
            if (u.hostname === "github.com") {
                // Expecting /<owner>/<repo>/raw/<sha>/<path>
                const parts = u.pathname.split("/").filter(Boolean);
                const idx = parts.indexOf("raw");
                if (idx >= 2 && idx + 2 < parts.length) {
                    const owner = parts[0];
                    const repo = parts[1];
                    const sha = parts[idx + 1];
                    const rest = parts.slice(idx + 2).join("/");
                    return `https://media.githubusercontent.com/media/${owner}/${repo}/${sha}/${rest}`;
                }
            }
            // Keep as-is for raw.githubusercontent.com and others
            return url;
        } catch {
            return url as any;
        }
    }

    /**
     * Construct a simplified filename variant, e.g., geoBoundaries-AGO-ADM2.topojson -> geoBoundaries-AGO-ADM2_simplified.topojson
     */
    public static withSimplifiedFilename(url: string, targetExt: "topojson" | "geojson"): string {
        try {
            const u = new URL(url);
            const segs = u.pathname.split("/");
            const file = segs.pop() || "";
            const dot = file.lastIndexOf(".");
            const base = dot > 0 ? file.substring(0, dot) : file;
            const hasSimplified = /_simplified$/i.test(base);
            const newBase = hasSimplified ? base : `${base}_simplified`;
            const newFile = `${newBase}.${targetExt}`;
            segs.push(newFile);
            u.pathname = segs.join("/");
            return u.toString();
        } catch {
            // Fallback naive replace
            return url.replace(/\.[a-z]+$/i, `.${targetExt}`).replace(/(\.[a-z]+)$/i, `_simplified$1`);
        }
    }

    /**
     * Get an ordered list of preferred download URLs for a metadata entry, favoring simplified TopoJSON then simplified GeoJSON.
     * Includes normalization for GitHub raw URLs to media.githubusercontent.com.
     */
    public static getPreferredDownloadUrls(metadata: GeoBoundariesMetadata): string[] {
        const candidates: string[] = [];
        const push = (url: string | null | undefined) => {
            if (!url) return;
            const norm = this.normalizeGithubRaw(url) || url;
            if (!candidates.includes(norm)) candidates.push(norm);
        };

        const tj = this.normalizeGithubRaw(metadata.tjDownloadURL) || metadata.tjDownloadURL;
        const gj = this.normalizeGithubRaw(metadata.gjDownloadURL) || metadata.gjDownloadURL;
        const simplifiedGJ = this.normalizeGithubRaw(metadata.simplifiedGeometryGeoJSON) || metadata.simplifiedGeometryGeoJSON;

        // 1) Prefer simplified TopoJSON derived from tj (if available)
        if (tj) push(this.withSimplifiedFilename(tj, "topojson"));
        // 2) Prefer declared simplified GeoJSON if provided
        push(simplifiedGJ);
        // 3) Fallback simplified GeoJSON derived from gj
        if (gj) push(this.withSimplifiedFilename(gj, "geojson"));
        // 4) Original TopoJSON
        push(tj);
        // 5) Original GeoJSON
        push(gj);

        return candidates;
    }

    /**
     * Checks if the request is for all countries data
     */
    public static isAllCountriesRequest(options: ChoroplethOptions): boolean {
        return options.geoBoundariesCountry === "ALL";
    }

    /**
     * Gets the data URL for all countries case
     */
    public static getAllCountriesUrl(): string {
        // Default to gbOpen ALL/ADM0 API endpoint for convenience
        return `${VisualConfig.GEOBOUNDARIES.BASE_URL}/gbOpen/ALL/ADM0/`;
    }

    /**
     * Gets the appropriate field name for the boundary data
     */
    public static getBoundaryFieldName(options: ChoroplethOptions): string {
        const { sourceFieldID } = options;
        
        // Map the UI field selection to actual geoBoundaries field names
        switch (sourceFieldID) {
            case "shapeISO":
                return "shapeISO";
            case "shapeName":
                return "shapeName";
            case "shapeID":
                return "shapeID";
            case "shapeGroup":
                return "shapeGroup";
            default:
                return "shapeISO"; // Default fallback
        }
    }

    /**
     * Validates if the combination of release type, country, and admin level is valid
     */
    public static validateOptions(options: ChoroplethOptions): { isValid: boolean; message?: string } {
        const { geoBoundariesReleaseType, geoBoundariesCountry, geoBoundariesAdminLevel } = options;

        if (!geoBoundariesReleaseType) {
            return { isValid: false, message: "Release type is required" };
        }

        if (!geoBoundariesCountry) {
            return { isValid: false, message: "Country selection is required" };
        }

        if (!geoBoundariesAdminLevel) {
            return { isValid: false, message: "Administrative level is required" };
        }

        // Special validation for "All Countries" - only ADM0 is allowed
        if (geoBoundariesCountry === "ALL" && geoBoundariesAdminLevel !== "ADM0") {
            return { isValid: false, message: "When 'All Countries' is selected, only ADM0 (country level) administrative level is supported" };
        }

        // Validate release type
        const validReleaseTypes = ["gbOpen", "gbHumanitarian", "gbAuthoritative"];
        if (!validReleaseTypes.includes(geoBoundariesReleaseType)) {
            return { isValid: false, message: "Invalid release type" };
        }

        // Validate admin level
        const validAdminLevels = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5", "ALL"];
        if (!validAdminLevels.includes(geoBoundariesAdminLevel)) {
            return { isValid: false, message: "Invalid administrative level" };
        }

        return { isValid: true };
    }

    /**
     * Gets a human-readable description of the boundary data
     */
    public static getDataDescription(metadata: GeoBoundariesMetadata): string {
        const adminLevel = metadata.boundaryType;
        const country = metadata.boundaryName;
        const year = metadata.boundaryYearRepresented;
        const count = metadata.admUnitCount;

        return `${country} ${adminLevel} boundaries (${year}) - ${count} units`;
    }

    /**
     * Fetch a full list of ADM0 metadata objects for the given release.
     * Caches results in-memory for VisualConfig.CACHE.METADATA_EXPIRY_MS.
     */
    public static async fetchAllCountriesMetadataByRelease(release: string): Promise<GeoBoundariesMetadata[] | null> {
        const ttl = VisualConfig.CACHE.METADATA_EXPIRY_MS;
        const cached = this.allCountriesMetadataCache[release];
        const now = Date.now();
        if (cached && now - cached.ts < ttl) {
            return cached.data;
        }
        try {
            const url = `${VisualConfig.GEOBOUNDARIES.BASE_URL}/${release}/ALL/ADM0/`;
            const resp = await fetch(url);
            if (!resp.ok) return null;
            const json = await resp.json();
            const arr = Array.isArray(json) ? (json as GeoBoundariesMetadata[]) : [json as GeoBoundariesMetadata];
            // Filter to entries with ISO codes, keep as-is otherwise
            const cleaned = arr.filter(x => !!x?.boundaryISO);
            this.allCountriesMetadataCache[release] = { data: cleaned, ts: now };
            return cleaned;
        } catch {
            return null;
        }
    }

    /**
     * Preload and cache dropdown items for the country list from the API.
     * Keeps "ALL" as the first option. Falls back silently if fetch fails.
     */
    public static async preloadCountryItems(release: string): Promise<void> {
        const now = Date.now();
        const ttl = VisualConfig.CACHE.METADATA_EXPIRY_MS;
        if (this.countryItemsCache && now - this.countryItemsCacheTime < ttl) return;
        const meta = await this.fetchAllCountriesMetadataByRelease(release);
        if (!meta) return;
        const items = meta
            .map(m => ({ value: (m.boundaryISO || '').toUpperCase(), displayName: m.boundaryName }))
            .filter(it => it.value && it.displayName)
            // Sort alphabetically by displayName for nicer UX
            .sort((a, b) => a.displayName.localeCompare(b.displayName));
        // Prepend ALL
        this.countryItemsCache = [{ value: "ALL", displayName: "All Countries" }, ...items];
        this.countryItemsCacheTime = now;
    }

    public static getCachedCountryItems(): { value: string; displayName: string }[] | null {
        return this.countryItemsCache;
    }
}
