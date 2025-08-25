import { VisualConfig } from "../config/VisualConfig";
import { CacheService } from "./CacheService";
import * as requestHelpers from "../utils/requestHelpers";

export interface GeoBoundariesCatalogCountry {
    iso3: string;        // e.g., KEN
    name: string;        // e.g., Kenya
    levels: string[];    // e.g., ["ADM0","ADM1","ADM2"]
}

export interface GeoBoundariesCatalogIndex {
    countries: GeoBoundariesCatalogCountry[];
    // optional fields could exist; keep it permissive
    [k: string]: any;
}

export interface GeoBoundariesCatalogEntry {
    release: string;    // e.g., gbopen | gbhumanitarian | gbauthoritative (lowercase)
    iso3: string;       // e.g., KEN
    level: string;      // e.g., admin1 (lowercase)
    file?: string;      // filename
    relPath?: string;   // path relative to /data/
    path?: string;      // some manifests duplicate relPath in "path"
    [k: string]: any;
}

/**
 * Lightweight catalog for GeoBoundaries countries and available admin levels.
 * Uses a small static index hosted on jsDelivr for fast enumeration in the format pane.
 */
export class GeoBoundariesCatalogService {
    private static cacheKey = "geoboundaries:catalog:index";
    private static cache = new CacheService();
    private static lastCatalog: GeoBoundariesCatalogIndex | null = null;

    /** Fetches and caches the catalog JSON. Returns null on failure. */
    public static async getCatalog(): Promise<GeoBoundariesCatalogIndex | null> {
        const url = VisualConfig.GEOBOUNDARIES.MANIFEST_URL;
        const ttl = VisualConfig.CACHE.METADATA_EXPIRY_MS || 30 * 60 * 1000;

        const result = await this.cache.getOrFetch(
            this.cacheKey,
            async () => {
                try {
                    const response = await requestHelpers.fetchWithTimeout(url, VisualConfig.NETWORK.FETCH_TIMEOUT_MS);
                    if (!response.ok) {
                        return null;
                    }
                    const data = await response.json();
                    return { data, response } as any; // Let CacheService inspect headers
                } catch {
                    return null as any;
                }
            },
            { ttlMs: ttl, respectCacheHeaders: true }
        );
        // Keep an in-memory copy for sync access in the formatting pane logic
        if (result && typeof result === 'object' && 'countries' in (result as any)) {
            this.lastCatalog = result as GeoBoundariesCatalogIndex;
        }
        return result;
    }

    /** Returns dropdown items for countries, prefixed with All Countries. Falls back to VisualConfig list. */
    public static async getCountryItems(): Promise<{ value: string; displayName: string }[]> {
        const fallback = VisualConfig.GEOBOUNDARIES.COUNTRIES;
        const idx = await this.getCatalog();
        if (!idx || !Array.isArray(idx.countries) || idx.countries.length === 0) {
            return fallback;
        }
        const items = [{ value: "ALL", displayName: "All Countries" }].concat(
            idx.countries
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(c => ({ value: c.iso3, displayName: c.name }))
        );
        return items;
    }

    /** Synchronous country list using last known catalog (or fallback). */
    public static getCountryItemsSync(): { value: string; displayName: string }[] {
        const idx = this.lastCatalog;
        if (!idx || !Array.isArray(idx.countries) || idx.countries.length === 0) {
            return VisualConfig.GEOBOUNDARIES.COUNTRIES;
        }
        return [{ value: "ALL", displayName: "All Countries" }].concat(
            idx.countries
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(c => ({ value: c.iso3, displayName: c.name }))
        );
    }

    /** Returns admin level items for a given ISO3, with sensible defaults when unknown. */
    public static async getAdminLevelItems(iso3?: string): Promise<{ value: string; displayName: string }[]> {
        const adminLabel = (lvl: string) => {
            switch (lvl) {
                case "ADM0": return "ADM0 (Country Borders)";
                case "ADM1": return "ADM1 (States/Provinces)";
                case "ADM2": return "ADM2 (Counties/Districts)";
                case "ADM3": return "ADM3 (Municipalities)";
                case "ADM4": return "ADM4";
                case "ADM5": return "ADM5";
                default: return lvl;
            }
        };

    if (!iso3 || iso3 === "ALL") {
            return [{ value: "ADM0", displayName: adminLabel("ADM0") }];
        }

        const idx = await this.getCatalog();
        const country = idx?.countries?.find(c => c.iso3 === iso3);
        let levels = country?.levels && country.levels.length > 0
            ? country.levels
            : ["ADM0", "ADM1", "ADM2", "ADM3"]; // fallback

        // For single-country selection, exclude ADM0
        levels = levels.filter(l => l !== "ADM0");
        if (levels.length === 0) {
            levels = ["ADM1"]; // minimal sensible default
        }

        return levels.map(l => ({ value: l, displayName: adminLabel(l) }));
    }

    /** Synchronous admin level list using last known catalog (or fallback). */
    public static getAdminLevelItemsSync(iso3?: string): { value: string; displayName: string }[] {
        const adminLabel = (lvl: string) => {
            switch (lvl) {
                case "ADM0": return "ADM0 (Country Borders)";
                case "ADM1": return "ADM1 (States/Provinces)";
                case "ADM2": return "ADM2 (Counties/Districts)";
                case "ADM3": return "ADM3 (Municipalities)";
                case "ADM4": return "ADM4";
                case "ADM5": return "ADM5";
                default: return lvl;
            }
        };

        if (!iso3 || iso3 === "ALL") {
            return [{ value: "ADM0", displayName: adminLabel("ADM0") }];
        }
        const idx = this.lastCatalog;
        const country = idx?.countries?.find(c => c.iso3 === iso3);
        let levels = country?.levels && country.levels.length > 0
            ? country.levels
            : ["ADM0", "ADM1", "ADM2", "ADM3"];
        levels = levels.filter(l => l !== "ADM0");
        if (levels.length === 0) {
            levels = ["ADM1"];
        }
        return levels.map(l => ({ value: l, displayName: adminLabel(l) }));
    }

    /** Internal: robustly extract the manifest entries array regardless of the property name. */
    private static extractEntriesArray(catalog: any): GeoBoundariesCatalogEntry[] {
        if (!catalog || typeof catalog !== 'object') return [];
        const candidateKeys = ["entries", "index", "items", "files", "records", "data"];
        for (const key of candidateKeys) {
            const arr = (catalog as any)[key];
            if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object') {
                const first = arr[0];
                if ("release" in first && "iso3" in first && "level" in first) return arr as GeoBoundariesCatalogEntry[];
            }
        }
        // As a last resort, scan all array-valued props
        for (const [key, value] of Object.entries(catalog)) {
            if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                const first = value[0] as any;
                if ("release" in first && "iso3" in first && "level" in first) return value as GeoBoundariesCatalogEntry[];
            }
        }
        return [];
    }

    /** Normalize release type from UI value (gbOpen etc.) to manifest value (lowercase). */
    private static normalizeRelease(release: string): string {
        const r = release || '';
        switch (r.toLowerCase()) {
            case 'gbopen': return 'gbopen';
            case 'gbhumanitarian': return 'gbhumanitarian';
            case 'gbauthoritative': return 'gbauthoritative';
            default: return r; // assume already correct
        }
    }

    /** Normalize admin level from UI value (ADM1) to manifest value (admin1). */
    private static normalizeLevel(level: string): string {
        if (!level) return '';
        const m = level.toUpperCase().startsWith('ADM') ? level.substring(3) : level;
        return `admin${m}`.toLowerCase();
    }

    /** Compute the CDN base for data files from the manifest URL. Ends with a trailing slash. */
    private static getCdnDataBase(): string {
        const manifestUrl = VisualConfig.GEOBOUNDARIES.MANIFEST_URL;
        // Strip trailing 'index.json' and ensure trailing slash
        return manifestUrl.replace(/index\.json$/i, '');
    }

    /** Resolve a TopoJSON URL from the manifest for the given release, iso3 and admin level. */
    public static async resolveTopoJsonUrl(release: string, iso3: string, adminLevel: string): Promise<string | null> {
        const idx = await this.getCatalog();
        if (!idx) return null;
        return this.resolveTopoJsonUrlSync(release, iso3, adminLevel);
    }

    /** Sync variant using last known catalog snapshot. */
    public static resolveTopoJsonUrlSync(release: string, iso3: string, adminLevel: string): string | null {
        const catalog = this.lastCatalog;
        if (!catalog) return null;
        const rel = this.normalizeRelease(release);
        const lvl = this.normalizeLevel(adminLevel);
        const iso = (iso3 || '').toUpperCase();
        const entries = this.extractEntriesArray(catalog);
        if (!entries.length) return null;
        const hit = entries.find(e => (e.release || '').toLowerCase() === rel
            && (e.iso3 || '').toUpperCase() === iso
            && (e.level || '').toLowerCase() === lvl);
        if (!hit) return null;
        const path = hit.relPath || hit.path || hit.file || '';
        if (!path) return null;
        const base = this.getCdnDataBase();
        // If path is already absolute (starts with http), return as-is
        if (/^https?:\/\//i.test(path)) return path;
        return `${base}${path}`;
    }
}

// Kick off a background fetch early so the formatting pane can reflect new items soon after load.
try { GeoBoundariesCatalogService.getCatalog().catch(() => {}); } catch {}
