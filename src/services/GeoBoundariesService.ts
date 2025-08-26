/*
 * GeoBoundaries API Service
 * 
 * This service handles integration with the geoBoundaries API
 * to fetch administrative boundary data dynamically.
 */

import { ChoroplethOptions } from "../types/index";
import { VisualConfig } from "../config/VisualConfig";
import * as requestHelpers from "../utils/requestHelpers";

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
    /**
     * Constructs the geoBoundaries API URL based on the options
     */
    public static buildApiUrl(options: ChoroplethOptions): string {
        const { geoBoundariesReleaseType, geoBoundariesCountry, geoBoundariesAdminLevel, geoBoundariesSourceTag } = options as any;

        // Special case: when "ALL" countries is selected, use the static consolidated ADM0 dataset
        if (geoBoundariesCountry === "ALL") {
            return VisualConfig.GEOBOUNDARIES.ALL_COUNTRIES_URL;
        }

        let url = `${VisualConfig.GEOBOUNDARIES.BASE_URL}/${geoBoundariesReleaseType}/${geoBoundariesCountry}/${geoBoundariesAdminLevel}/`;
        // If a tag is supplied, some upstream APIs allow scoping by tag via an @segment — try to append if present in BASE_URL patterns
        if (geoBoundariesSourceTag) {
            // If BASE_URL contains an @<tag> segment, replace it, otherwise attempt to append the tag query param as a fallback
            if (VisualConfig.GEOBOUNDARIES.BASE_URL.includes('@')) {
                url = `${VisualConfig.GEOBOUNDARIES.BASE_URL.replace(/@[^/]+/, `@${geoBoundariesSourceTag}`)}/${geoBoundariesReleaseType}/${geoBoundariesCountry}/${geoBoundariesAdminLevel}/`;
            } else {
                // Fallback: append query param 'tag' where supported by some endpoints
                try {
                    const u = new URL(url);
                    u.searchParams.set('tag', geoBoundariesSourceTag);
                    url = u.toString();
                } catch {
                    // ignore
                }
            }
        }
        return url;
    }

    /**
     * Fetches metadata from the geoBoundaries API
     * Returns both the parsed metadata (data) and the underlying fetch Response (response)
     * so callers/caches can optionally honor Cache-Control headers.
     */
    public static async fetchMetadata(options: ChoroplethOptions): Promise<{ data: GeoBoundariesMetadata | null; response: Response | null }> {
        // For the consolidated ALL countries dataset, there's no metadata endpoint; return a minimal stub
        if (this.isAllCountriesRequest(options)) {
            const stub: Partial<GeoBoundariesMetadata> = {
                boundaryISO: "ALL",
                boundaryName: "All Countries",
                boundaryType: "ADM0",
                boundaryYearRepresented: "",
                admUnitCount: ""
            };
            return { data: stub as GeoBoundariesMetadata, response: null };
        }
        try {
            const apiUrl = this.buildApiUrl(options);
            let response: Response;
            try {
                response = await requestHelpers.fetchWithTimeout(apiUrl, VisualConfig.NETWORK.FETCH_TIMEOUT_MS);
            } catch (err) {
                console.error("GeoBoundaries API fetch timeout or network error:", err);
                return { data: null, response: null };
            }

            if (!response.ok) {
                console.error(`GeoBoundaries API error: ${response.status} ${response.statusText}`);
                return { data: null, response };
            }

            const payload: any = await response.json();
            // Some endpoints may return an array; pick the first valid entry
            const selectEntry = (val: any): GeoBoundariesMetadata | null => {
                if (!val) return null;
                const candidate = Array.isArray(val) ? val.find((e: any) => e && (e.gjDownloadURL || e.tjDownloadURL)) : val;
                if (candidate && (candidate.gjDownloadURL || candidate.tjDownloadURL)) {
                    return candidate as GeoBoundariesMetadata;
                }
                return null;
            };
            const metadata = selectEntry(payload);
            if (!metadata) {
                console.error("GeoBoundaries metadata missing download URLs");
                return { data: null, response };
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
        if (preferTopoJSON && metadata.tjDownloadURL) {
            return metadata.tjDownloadURL;
        }
        return metadata.gjDownloadURL;
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
        return VisualConfig.GEOBOUNDARIES.ALL_COUNTRIES_URL;
    }

    /**
     * Gets the appropriate field name for the boundary data
     */
    public static getBoundaryFieldName(options: ChoroplethOptions): string {
        const anyOpts = options as any;
        const sourceFieldID = anyOpts?.sourceFieldID;

        // If the user supplied an explicit field name (from the UI), prefer it directly.
        // This allows choices like 'hdx_pcode' or 'hdx_name' to be used when present in the dataset.
        if (sourceFieldID && typeof sourceFieldID === 'string' && sourceFieldID.trim() !== '') {
            return sourceFieldID.trim();
        }
    // Default fallback when nothing specified
    return "shapeGroup";
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
}
