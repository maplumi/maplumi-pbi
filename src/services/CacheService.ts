import { VisualConfig } from "../config/VisualConfig";
import { CacheEntry } from "../types/index";

export class CacheService {
    private cache: Map<string, CacheEntry<any>>;
    private maxEntries: number;
    private expiryMs: number; // default TTL when not specified
    private pending: Map<string, Promise<any>>;

    constructor() {
        this.cache = new Map();
        this.maxEntries = VisualConfig.CACHE.MAX_ENTRIES;
        this.expiryMs = VisualConfig.CACHE.EXPIRY_MS;
    this.pending = new Map();
    }

    // Generic fetch with optional per-entry TTL override and response header inspection
    public async getOrFetch<T>(
        key: string,
        fetchFn: () => Promise<T>,
        options?: { ttlMs?: number; response?: Response | null; respectCacheHeaders?: boolean }
    ): Promise<T> {
        const cached = this.cache.get(key);

    if (cached && this.isValid(cached)) {
            return cached.data;
        }

        // Coalesce concurrent in-flight fetches for the same key
    const existing = this.pending.get(key) as Promise<T> | undefined;
        if (existing) {
            return existing;
        }

        const p = (async () => {
            try {
                const result = await fetchFn();
                // Support both direct data and { data, response }
                let data: any = result;
                let response: Response | null = null;
                if (result && typeof result === 'object' && 'data' in result && 'response' in result) {
                    data = (result as any).data;
                    response = (result as any).response as Response | null;
                }
                // Only cache truthy values; avoid caching null/undefined failures
                if (data !== null && data !== undefined) {
                    // Determine TTL
                    let ttl = options?.ttlMs ?? this.expiryMs;
                    const respToInspect = options?.respectCacheHeaders ? (response ?? options?.response ?? null) : null;
                    if (respToInspect) {
                        const header = respToInspect.headers.get('Cache-Control') || '';
                        const m = header.match(/max-age=(\d+)/i);
                        if (m) {
                            const maxAgeSec = parseInt(m[1], 10);
                            if (!Number.isNaN(maxAgeSec) && maxAgeSec > 0) {
                                ttl = Math.min(ttl, maxAgeSec * 1000);
                            }
                        }
                    }
                    this.set(key, data, ttl);
                }
                return data as T;
            } finally {
                this.pending.delete(key);
            }
        })();
        this.pending.set(key, p);
        return p;
    }

    public set<T>(key: string, data: T, ttlMs?: number): void {
        if (this.cache.size >= this.maxEntries) {
            this.evictOldest();
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + (ttlMs ?? this.expiryMs)
        });
    }

    public get<T>(key: string): T | undefined {
        const entry = this.cache.get(key);
        if (!entry || !this.isValid(entry)) {
            return undefined;
        }
        return entry.data;
    }

    public clear(): void {
        this.cache.clear();
    }

    private isValid(entry: CacheEntry<any>): boolean {
        return Date.now() < entry.expiresAt;
    }

    private evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTimestamp = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }
} 