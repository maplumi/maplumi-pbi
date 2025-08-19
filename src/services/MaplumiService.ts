"use strict";

import { VisualConfig } from "../config/VisualConfig";
import * as requestHelpers from "../utils/requestHelpers";

/**
 * Service for fetching Maplumi self-hosted boundary datasets.
 * Currently supports a world ADM0 dataset derived from geoBoundaries CGAZ, simplified.
 */
export class MaplumiService {
    /**
     * Fetch the world ADM0 dataset as a GeoJSON FeatureCollection.
     */
    static async fetchWorldAdm0(): Promise<any> {
        const url = VisualConfig.MAPLUMI.CGAZ_ADM0_URL;
        if (!requestHelpers.isValidURL(url) || !requestHelpers.enforceHttps(url)) {
            throw new Error("Invalid Maplumi URL");
        }
        const resp = await requestHelpers.fetchWithTimeout(url, VisualConfig.NETWORK.FETCH_TIMEOUT_MS);
        if (!resp.ok) throw new Error(`Maplumi request failed: ${resp.status}`);
        const json = await resp.json();
        return json;
    }
}
