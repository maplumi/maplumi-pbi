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
    /**
     * Constructs the geoBoundaries API URL based on the options
     */
    public static buildApiUrl(options: ChoroplethOptions): string {
        const { geoBoundariesReleaseType, geoBoundariesCountry, geoBoundariesAdminLevel } = options;

        // Special case: when "ALL" countries is selected, use the static consolidated ADM0 dataset
        if (geoBoundariesCountry === "ALL") {
            return VisualConfig.GEOBOUNDARIES.ALL_COUNTRIES_URL;
        }

        return `${VisualConfig.GEOBOUNDARIES.BASE_URL}/${geoBoundariesReleaseType}/${geoBoundariesCountry}/${geoBoundariesAdminLevel}/`;
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
            const response = await fetch(apiUrl);

            if (!response.ok) {
                console.error(`GeoBoundaries API error: ${response.status} ${response.statusText}`);
                return { data: null, response };
            }

            const metadata: GeoBoundariesMetadata = await response.json();
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
}
