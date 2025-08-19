"use strict";

import { VisualConfig } from "../config/VisualConfig";
import * as requestHelpers from "../utils/requestHelpers";

export interface ODSRecord {
    iso3?: string;
    name?: string;
    status?: string;
    continent?: string;
    region?: string;
    color_code?: string;
    iso_3166_1_alpha_3?: string;
    geo_shape?: any; // GeoJSON Feature
}

export class OpenDataSoftService {
    /**
     * Fetch the world administrative boundaries dataset and return a valid GeoJSON FeatureCollection.
     * Only Polygon/MultiPolygon features are included. Properties are normalized to include iso3 and name.
     */
    static async fetchWorldAdm0(): Promise<any> {
        const url = VisualConfig.OPENDATASOFT.WORLD_ADM0_URL;
        if (!requestHelpers.isValidURL(url) || !requestHelpers.enforceHttps(url)) {
            throw new Error("Invalid ODS URL");
        }
        const resp = await requestHelpers.fetchWithTimeout(url, VisualConfig.NETWORK.FETCH_TIMEOUT_MS);
        if (!resp.ok) throw new Error(`ODS request failed: ${resp.status}`);
        const json = await resp.json();
        // Expect shape { results: [...] }
        const results: any[] = Array.isArray(json?.results) ? json.results : [];
        const features: any[] = [];
        for (const r of results) {
            const rec: ODSRecord = r as any;
            const feat = rec?.geo_shape;
            if (!feat || (feat.type !== "Feature")) continue;
            const geomType = feat.geometry?.type;
            if (geomType !== "Polygon" && geomType !== "MultiPolygon") continue;
            const properties = {
                iso3: rec.iso3 || rec.color_code || rec?.iso_3166_1_alpha_3 || undefined,
                name: rec.name || (feat.properties && feat.properties.name) || undefined,
                status: rec.status,
                continent: rec.continent,
                region: rec.region
            } as any;
            features.push({
                type: "Feature",
                geometry: feat.geometry,
                properties
            });
        }
        return { type: "FeatureCollection", features };
    }
}
